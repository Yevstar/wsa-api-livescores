import {Match} from "../models/Match";
import {convertMatchStartTimeByTimezone} from "../utils/TimeFormatterUtils";
import {StateTimezone} from "../models/StateTimezone";

export function getMatchUmpireNotificationMessage(
    match: Match,
    stateTimezone: StateTimezone,
    rosterLocked: boolean
): string {
    let constants = require('../constants/Constants');

    let matchTime = convertMatchStartTimeByTimezone(
        match.startTime,
        stateTimezone != null ? stateTimezone.timezone : null,
        `${constants.DATE_FORMATTER_KEY} at ${constants.TIME_FORMATTER_KEY}`
    );

    var messageBody
    if (rosterLocked) {
      messageBody = `${match.competition.name} has sent you a ` +
              `new Umpiring Duty for ${matchTime}.`;
    } else {
      messageBody = `${match.competition.name} has sent you a ` +
              `new Umpiring Duty for ${matchTime}. ` +
              `Please log into your Netball Live Scores ` +
              `App to accept/decline.`;
    }

    return messageBody;
}
