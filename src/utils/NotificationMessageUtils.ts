import {Match} from "../models/Match";
import {convertMatchStartTimeByTimezone} from "../utils/TimeFormatterUtils";
import {StateTimezone} from "../models/StateTimezone";
import {isNotNullAndUndefined} from "../utils/Utils";

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
              `Please log into your NetballConnect ` +
              `App to accept/decline.`;
    }

    return messageBody;
}

export function getMatchUpdatedNonSilentNotificationMessage(
    matchStartTime: Date,
    venueDetails: String,
    stateTimezone: StateTimezone
): string {
    let constants = require('../constants/Constants');

    let matchTime = convertMatchStartTimeByTimezone(
        matchStartTime,
        stateTimezone != null ? stateTimezone.timezone : null,
        `${constants.DATE_FORMATTER_KEY} at ${constants.TIME_FORMATTER_KEY}`
    );

    var messageBody;
    if (isNotNullAndUndefined(venueDetails) && venueDetails.length > 0) {
      messageBody = `A change has been made to your match on ` +
          `${matchTime} on ${venueDetails}. Please check match details.`
    } else {
      messageBody = `A change has been made to your match on ` +
          `${matchTime}. Please check match details.`
    }

    return messageBody;
}
