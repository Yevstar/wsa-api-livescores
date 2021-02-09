import {Service} from "typedi";
import {DeleteResult} from "typeorm-plus";
import BaseService from "./BaseService";
import {MatchEvent} from "../models/MatchEvent";

@Service()
export default class MatchEventService extends BaseService<MatchEvent> {

    modelName(): string {
        return MatchEvent.name;
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
        foul: string
    ): Promise<MatchEvent[]> {
        let query = this.entityManager.createQueryBuilder(MatchEvent, 'matchEvent')
            .andWhere('matchEvent.matchId = :matchId', {matchId: matchId})
            .andWhere('matchEvent.period = :period', {period: periodNumber});

        if (gameStatCode == 'G') {
            query.andWhere('(matchEvent.eventCategory = :scoreEventCategory or ' +
                  'matchEvent.eventCategory = :statEventCategory)', {
                    scoreEventCategory: 'score',
                    statEventCategory: 'stat'
                })
                .andWhere('(matchEvent.type = :scoreEventType or ' +
                  'matchEvent.type = :statEventType)', {
                    scoreEventType: 'update',
                    statEventType: recordPoints ? 'Points' : gameStatCode
                });

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

            query.andWhere('(matchEvent.attribute1Value = :scoreAttribute1Value ' +
              'or matchEvent.attribute1Value = :statAttribute1Value)', {
                  scoreAttribute1Value: team1Score.toString(),
                  statAttribute1Value: recordPoints ? points.toString() : positionId.toString()
              })
              .andWhere('(matchEvent.attribute2Key = :scoreAttribute2Key ' +
              'or matchEvent.attribute2Key = :statAttribute2Key)', {
                  scoreAttribute2Key: 'team2score',
                  statAttribute2Key: 'playerId'
              })
              .andWhere('(matchEvent.attribute2Value = :scoreAttribute2Value ' +
              'or matchEvent.attribute2Value = :statAttribute2Value)', {
                  scoreAttribute2Value: team2Score.toString(),
                  statAttribute2Value: playerId.toString()
              });
        } else {
            query.andWhere('matchEvent.eventCategory = :eventCategory', {
                  eventCategory: 'stat'
                });

            query.andWhere('matchEvent.type = :type', {
              type: recordPoints ?
                this.getRecordPointsType(gameStatCode) :
                gameStatCode
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
        if (gameStatCode == 'G') {
          query.limit(2);
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
        case 'M':
          return points.toString();
        case 'F':
          return foul;
        default:
          return '';
      }
    }

    private getRecordPointsType(gameStatCode: string) {
      switch (gameStatCode) {
        case 'M':
          return 'MissedPoints';
        case 'F':
          return 'Foul';
        default:
          return gameStatCode;
      }
    }
}