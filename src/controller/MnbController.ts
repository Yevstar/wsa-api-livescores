import { Authorized, Get, JsonController } from 'routing-controllers';
import { submitAttendance, submitScore } from '../integration/mynb';
import { Attendance } from '../models/Attendance';
import * as _ from 'lodash';
import { BaseController } from './BaseController';

@Authorized()
@JsonController('/mnb')
export class MnbController extends BaseController {
  @Authorized('spectator')
  @Get('/push/matches')
  async scores() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const matches = await this.matchService.findByMnb();
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const { mnbUrl, mnbUser, mnbPassword } = match.competition;
      await submitScore(
        match.mnbMatchId,
        match.team1Score,
        match.team2Score,
        mnbUrl,
        mnbUser,
        mnbPassword,
      );
      // Update the submission flag on match.
      match.mnbPushed = true;
      await this.matchService.createOrUpdate(match);
    }
    return {};
  }

  @Get('/push/attendance')
  async attendance() {
    const attendances = await this.gameTimeAttendanceService.findByMnb();
    const groupedAttendances = _.groupBy(
      attendances,
      (attendance: Attendance) => attendance.match.mnbMatchId,
    );
    for (let mnbMatchId in groupedAttendances) {
      let team1PlayerIds = [];
      let team2PlayerIds = [];
      const { mnbUrl, mnbUser, mnbPassword } = groupedAttendances[mnbMatchId][0].match.competition;

      // Load team1/team2 player ids.
      groupedAttendances[mnbMatchId].forEach((attendance: Attendance) => {
        if (attendance.teamId == attendance.match.team1Id) {
          team1PlayerIds = attendance.playerIdsJson as any;
        }
        if (attendance.teamId == attendance.match.team2Id) {
          team2PlayerIds = attendance.playerIdsJson as any;
        }
      });
      await submitAttendance(
        mnbMatchId,
        team1PlayerIds,
        team2PlayerIds,
        mnbUrl,
        mnbUser,
        mnbPassword,
      );

      // Update the submission flags on the attendance records.
      await Promise.all(
        groupedAttendances[mnbMatchId].map((attendance: Attendance) => {
          attendance.mnbPushed = true;

          // Confusing...
          attendance.playerIdsJson = JSON.stringify(attendance.playerIdsJson);
          return this.attendanceService.createOrUpdate(attendance);
        }),
      );
    }
    return {};
  }
}
