import {Service} from "typedi";
import {DeleteResult} from "typeorm-plus";
import BaseService from "./BaseService";
import {MatchEvent} from "../models/MatchEvent";
import {
    isNotNullAndUndefined
} from "../utils/Utils";
import {GameStatCodeEnum} from "../models/enums/GameStatCodeEnum";

@Service()
export default class MatchEventService extends BaseService<MatchEvent> {

    modelName(): string {
        return MatchEvent.name;
    }

    public isGameStatGoalOrPoints(gameStatCode: string): boolean {
        return (
            gameStatCode == GameStatCodeEnum.G ||
            gameStatCode == GameStatCodeEnum.P ||
            gameStatCode == GameStatCodeEnum.Pe ||
            gameStatCode == GameStatCodeEnum.OG
        );
    }

    public isGameStatMissOrMissedPoints(gameStatCode: string): boolean {
        return (gameStatCode == GameStatCodeEnum.M || gameStatCode == GameStatCodeEnum.MP);
    }

    public async findEventsByMatchId(matchId: number): Promise<MatchEvent[]> {
        let query = this.entityManager.createQueryBuilder(MatchEvent, 'matchEvent')
            .andWhere('matchEvent.matchId = :matchId', { matchId });
        return query.getMany();
    }

    public async logMatchEvent(matchId: number, category: string, type: string, period: number, eventTimestamp: Date,
                               userId: number,
                               attribute1Key: string = undefined, attribute1Value: string = undefined,
                               attribute2Key: string = undefined, attribute2Value: string = undefined) {
        let me = new MatchEvent();
        me.matchId = matchId;
        me.eventCategory = category;
        me.type = type;
        me.eventTimestamp = eventTimestamp;
        me.period = period;
        if (attribute1Key) {
            me.attribute1Key = attribute1Key;
            me.attribute1Value = attribute1Value;
        }
        if (attribute2Key) {
            me.attribute2Key = attribute2Key;
            me.attribute2Value = attribute2Value;
        }
        me.userId = userId;
        me.source = 'app';

        /// ----
        // *****
        // Following s3 upload is creating issue InvalidAccessKeyId: The AWS Access Key Id you provided does not exist in our records.
        // and making server to restart due to it match update score service is facing issue.
        // So commenting out the code for now
        // *****
        // To convert into avro format
        // let inferredType = avro.Type.forValue(me); // Infer the type of a `me`.
        // let buf = inferredType.toBuffer(me);
        // const params = {
        //     Bucket: process.env.EVENT_STORE_BUCKET, // pass your bucket name
        //     Key: Date.now() + ".avro",
        //     Body: buf
        // };
        // s3.upload(params, function (s3Err, data) {
        //     if (s3Err) throw s3Err;
        //
        //     console.log("File uploaded successfully");
        // });
        /// ----

        return this.entityManager.insert(MatchEvent, me);
    }

    public async logLiteMatchEvent(matchId: number, category: string, type: string, period: number,
                                   eventTimestamp: Date, userId: number) {
        let me = new MatchEvent();
        me.matchId = matchId;
        me.eventCategory = category;
        me.type = type;
        me.period = period;
        me.userId = userId;
        me.source = 'app';
        return this.entityManager.insert(MatchEvent, me);
    }

    public async updateMatchStatEvent(
        matchId: number,
        team: String,
        gamePositionId: number,
        playerId: number
    ) {
        let query = this.entityManager.createQueryBuilder(MatchEvent, 'me')
            .update(MatchEvent)
            .set({ attribute2Value: playerId.toString() })
            .where("eventCategory = 'stat'")
            .andWhere("matchId = :matchId", { matchId })
            .andWhere("attribute1Key = :team", { team })
            .andWhere("attribute1Value = :gamePositionId", { gamePositionId });
        return query.execute();
    }

    public async deleteMatchEventByIds(ids: number[]): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(MatchEvent)
            .andWhere("id in (:ids)", {ids: ids}).execute();
    }

    public async findByParams(
        matchId: number,
        gameStatCode: string,
        periodNumber: number,
        teamSequence: number,
        playerId: number,
        team1Score: number,
        team2Score: number,
        positionId: number,
        recordPoints: boolean,
        points: number,
        foul: string,
        recordAssistPlayer: boolean,
        assistPlayerPositionId: number,
        assistPlayerId: number,
    ): Promise<MatchEvent[]> {
        let query = this.entityManager.createQueryBuilder(MatchEvent, 'matchEvent')
            .andWhere('matchEvent.matchId = :matchId', {matchId: matchId})
            .andWhere('matchEvent.period = :period', {period: periodNumber});

        if (this.isGameStatGoalOrPoints(gameStatCode)) {
            query.andWhere('(matchEvent.eventCategory = :scoreEventCategory or ' +
                  'matchEvent.eventCategory = :statEventCategory)', {
                    scoreEventCategory: 'score',
                    statEventCategory: 'stat'
                })
            if (isNotNullAndUndefined(recordAssistPlayer) && recordAssistPlayer) {
                query.andWhere('(matchEvent.type = :scoreEventType or ' +
                    'matchEvent.type = :statEventType or ' +
                    'matchEvent.type = :assistEventType)', {
                        scoreEventType: 'update',
                        statEventType: gameStatCode,
                        assistEventType: 'A'
                    });
            } else {
                query.andWhere('(matchEvent.type = :scoreEventType or ' +
                    'matchEvent.type = :statEventType)', {
                        scoreEventType: 'update',
                        statEventType: gameStatCode
                    });
            }

            if (teamSequence == 1) {
                query.andWhere('(matchEvent.attribute1Key = :scoreAttribute1Key ' +
                    'or matchEvent.attribute1Key = :statAttribute1Key)', {
                      scoreAttribute1Key: 'team1score',
                      statAttribute1Key: 'team1'
                    });
            } else {
              query.andWhere('(matchEvent.attribute1Key = :scoreAttribute1Key ' +
                  'or matchEvent.attribute1Key = :statAttribute1Key)', {
                    scoreAttribute1Key: 'team1score',
                    statAttribute1Key: 'team2'
                  });
            }

            if (isNotNullAndUndefined(recordAssistPlayer) && recordAssistPlayer) {
              query.andWhere('(matchEvent.attribute1Value = :scoreAttribute1Value ' +
                'or matchEvent.attribute1Value = :statAttribute1Value ' +
                'or matchEvent.attribute1Value = :assistAttribute1Value)', {
                    scoreAttribute1Value: team1Score.toString(),
                    statAttribute1Value: recordPoints ? points.toString() : (positionId ? positionId.toString() : ''),
                    assistAttribute1Value: assistPlayerPositionId ? assistPlayerPositionId.toString() : ''
                });
            } else {
              query.andWhere('(matchEvent.attribute1Value = :scoreAttribute1Value ' +
                'or matchEvent.attribute1Value = :statAttribute1Value)', {
                    scoreAttribute1Value: team1Score.toString(),
                    statAttribute1Value: recordPoints ? points.toString() : (positionId ? positionId.toString() : '')
                });
            }

            query.andWhere('(matchEvent.attribute2Key = :scoreAttribute2Key ' +
              'or matchEvent.attribute2Key = :statAttribute2Key)', {
                  scoreAttribute2Key: 'team2score',
                  statAttribute2Key: 'playerId'
              });

            if (isNotNullAndUndefined(recordAssistPlayer) && recordAssistPlayer) {
              query.andWhere('(matchEvent.attribute2Value = :scoreAttribute2Value ' +
                'or matchEvent.attribute2Value = :statAttribute2Value ' +
                'or matchEvent.attribute2Value = :assistAttribute2Value)', {
                    scoreAttribute2Value: team2Score.toString(),
                    statAttribute2Value: playerId.toString(),
                    assistAttribute2Value: assistPlayerId ? assistPlayerId.toString() : ''
                });
            } else {
              query.andWhere('(matchEvent.attribute2Value = :scoreAttribute2Value ' +
                'or matchEvent.attribute2Value = :statAttribute2Value)', {
                    scoreAttribute2Value: team2Score.toString(),
                    statAttribute2Value: playerId.toString()
                });
            }
        } else {
            query.andWhere('matchEvent.eventCategory = :eventCategory', {
                  eventCategory: 'stat'
                });

            query.andWhere('matchEvent.type = :type', {
              type: gameStatCode
            });

            if (teamSequence == 1) {
                query.andWhere('matchEvent.attribute1Key = :attribute1Key', {
                    attribute1Key: 'team1',
                  });
            } else {
                query.andWhere('matchEvent.attribute1Key = :attribute1Key', {
                    attribute1Key: 'team2',
                  });
            }

            query.andWhere('matchEvent.attribute1Value = :attribute1Value', {
                  attribute1Value: recordPoints ?
                    this.getRecordPointsAttribute1Value(gameStatCode, points, foul) :
                    positionId.toString()
              })
              .andWhere('matchEvent.attribute2Key = :attribute2Key', {
                  attribute2Key: 'playerId'
              })
              .andWhere('matchEvent.attribute2Value = :attribute2Value', {
                  attribute2Value: playerId.toString()
              });
        }

        query.orderBy('matchEvent.id', 'DESC');
        if (this.isGameStatGoalOrPoints(gameStatCode)) {
          if (isNotNullAndUndefined(recordAssistPlayer) && recordAssistPlayer) {
            query.limit(3);
          } else {
            query.limit(2);
          }
        } else {
          query.limit(1);
        }

        return query.getMany();
    }

    private getRecordPointsAttribute1Value(
        gameStatCode: string,
        points: number,
        foul: string
    ) {
      switch (gameStatCode) {
        case GameStatCodeEnum.MP:
          return points.toString();
        case GameStatCodeEnum.F:
          return foul;
        default:
          return '';
      }
    }
}
