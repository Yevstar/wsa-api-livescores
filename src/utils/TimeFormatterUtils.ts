export function convertMatchStartTimeByTimezone(
    time: Date,
    timezone: string,
    formatBy: string
): string {
    let constants = require('../constants/Constants');

    if (timezone) {
        let dateOptions = {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit'
        };
        let timeOptions = {
            timeZone: timezone,
            hour: 'numeric', minute: 'numeric'
        };
        let dateFormatter = new Intl.DateTimeFormat('en-US', dateOptions);
        let timeFormatter = new Intl.DateTimeFormat('en-AU', timeOptions);

        let matchStartTime = new Date(
            Date.UTC(time.getFullYear(),
                time.getMonth(),
                time.getDate(),
                time.getHours(),
                time.getMinutes(),
                time.getSeconds()
            )
        );

        // date formatter was formatting as mm/dd/yyyy so hack used !!
        // let matchDate = `${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()}`; -- was not using timezone so discarded
        let dateString = dateFormatter.format(matchStartTime);
        let matchDate = dateString.substr(3, 2)+"/"+dateString.substr(0, 2)+"/"+dateString.substr(6, 4);

        let matchTime = timeFormatter.format(matchStartTime);
        

        var formattedValue = formatBy;
        formattedValue = formattedValue.replace(constants.DATE_FORMATTER_KEY, matchDate);
        formattedValue = formattedValue.replace(constants.TIME_FORMATTER_KEY, matchTime);

        return formattedValue;
    } else {
        return time.toString();
    }
}
