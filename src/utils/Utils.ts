import crypto from "crypto";
import * as jwt from "jwt-simple";
import AWS from "aws-sdk";
import { BaseEntity } from "typeorm-plus";
import validator from "email-validator";

export function md5(password: string): string {
    return crypto.createHash('md5').update(password).digest("hex");
}

export function authToken(email: string, password: string): string {
    const data = `${email.toLowerCase()}:${password}`;
    return encrypt(jwt.encode({ data }, process.env.SECRET));
}

export function isNullOrEmpty(value: string): boolean {
    return (!value || 0 === value.length);
}

export function contain(arr, value): boolean {
    return arr.indexOf(value) > -1
}

export function chunk(array, size) {
    const chunked_arr = [];
    let copied = [...array];
    const numOfChild = Math.ceil(copied.length / size);
    for (let i = 0; i < numOfChild; i++) {
        chunked_arr.push(copied.splice(0, size));
    }
    return chunked_arr;
}

export function timestamp(): number {
    return new Date().getTime();
}

export function isPhoto(mimetype: string): boolean {
    return mimetype && mimetype == 'image/jpeg' || mimetype == 'image/jpg' || mimetype == 'image/png' || mimetype == 'image/webp';
}

export function fileExt(fileName: string): string {
    return fileName.split('.').pop();
}

export function isVideo(mimetype: string): boolean {
    if (!mimetype) return false;
    switch (mimetype) {
        case 'video/mp4':
        case 'video/quicktime':
        case 'video/mpeg':
        case 'video/mp2t':
        case 'video/webm':
        case 'video/ogg':
        case 'video/x-ms-wmv':
        case 'video/3gpp':
        case 'video/3gpp2':
        case 'video/avi':
        case 'video/msvideo':
        case 'video/x-msvideo':
            return true;
        default:
            return false;
    }
}

export function isArrayPopulated(checkArray: any): boolean {
    if (checkArray !== 'undefined'
        && checkArray !== null
        && Array.isArray(checkArray)
        && checkArray.length > 0) {
        return true;
    }
    return false;
}

export function stringTONumber(checkString: string | number): number {
    return typeof checkString === 'string' ? parseInt(checkString) : checkString;
}

export function stringToBoolean(value: string | number | boolean): boolean {
    switch (value) {
        case true:
        case "true":
        case 1:
        case "1":
            return true;
        default:
            return false;
    }
}

export function decrypt(data) {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPT_TOKEN);
    let dec = decipher.update(data, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

export function encrypt(data) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPT_TOKEN);
    let crypted = cipher.update(data, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

export function paginationData(totalCount: number, LIMIT: number, OFFSET: number) {
    let totalPages = Math.ceil(totalCount / LIMIT);
    let currentPage = Math.floor(OFFSET / LIMIT);
    let prevPage = (currentPage - 1) > 0 ? (currentPage - 1) * LIMIT : 0;
    let nextPage = (currentPage + 1) <= totalPages ? (currentPage + 1) * LIMIT : 0;

    return {
        page: {
            nextPage,
            prevPage,
            totalCount,
            currentPage: currentPage + 1
        }
    }
}

export function isNotNullAndUndefined(value: any): Boolean {
    return value !== null && value !== undefined;
}

export function isEmpty(value: any): Boolean {
    return value == null || value == '';
}

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export function objectIsNotEmpty(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) return true;
    }
    return false;
}

export const fileUploadOptions = {
    limits: {
        fileSize: process.env.FILE_UPLOAD_SIZE
    }
};

export function parseDateString(dateStr: string): Date {
    let dStr = trim(dateStr);
    if (!dStr) {
        return new Date(-1, 0, 0);
    }

    const split = dStr.split('/');
    const dobStr = split.length === 3 ? split : dStr.split('.');
    if (dobStr.length !== 3) {
        return new Date(-1, 0, 0);
    }

    let year = parseInt(dobStr[2], 10);
    if (Number.isNaN(year) || year < 0) {
        return new Date(-1, 0, 0);
    }

    // TODO: need to confirm from when we will think 21th
    if (year < 30) {
        year += 2000;
    } else if (year < 100) {
        year += 1900;
    }

    const month = parseInt(dobStr[1], 10);
    if (Number.isNaN(month) || month < 1 || month > 12) {
        return new Date(-1, 0, 0);
    }

    let dateMax = 31;
    if ([4, 6, 9, 11].indexOf(month)) {
        dateMax = 30;
    } else if (month === 2) {
        if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
            dateMax = 29;
        } else {
            dateMax = 28;
        }
    }

    const date = parseInt(dobStr[0], 10);
    if (Number.isNaN(date) || date < 1 || date > dateMax) {
        return new Date(-1, 0, 0);
    }

    return new Date(year, month - 1, date);
}

export function formatPhoneNumber(phoneNumber: string): string {
    let phone = trim(phoneNumber);
    return (phone && phone.charAt(0) === '4') ? `0${phone}` : phone;
}

export function validationForField({ filedList, values }: { filedList: string[], values: any[] }) {
    const message = {};
    const successRes: any[] = [];
    const templateRes: BaseEntity[] = [];

    values.forEach((val, index) => {
        const msg: string[] = [];
        let tempValue = { ...val };
        filedList.forEach((field) => {
            if (isNullOrEmpty(val[field])) {
                msg.push(`The field '${field}' is required.`);
            } else {
                if (field === 'dateOfBirth' ||  field === 'Date') {
                    const date = typeof tempValue[field] === 'string' ? parseDateString(tempValue[field]) : tempValue[field];
                    if (date.getFullYear() < 1000) {
                        msg.push(`The '${field}' value is invalid date.`);
                    }
                    tempValue[field] = `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}`;
                } else if (field.toLowerCase() === 'email' && !validator.validate(val[field])) {
                    msg.push(`The '${field}' value is invalid email.`);
                } else if (field.toLowerCase() === 'teamid' && val[field] < 0) {
                    msg.push(`No matching team found for ${val['firstName']} ${val['lastName']}`);
                } else if (field.toLowerCase() === 'round') {
                    let value;
                    if (val[field].toLowerCase().indexOf("round") > -1) {
                        const roundSplitStr = val[field].split(" ");
                        value = stringTONumber(roundSplitStr.length > 1 ? roundSplitStr[1] : roundSplitStr[0]);
                    } else {
                        value = stringTONumber(val[field]);
                    }
                    if (Number.isNaN(value)) {
                        msg.push(`Round value "${tempValue[field]}" is invalid input.`);
                    }
                }
            }
        });

        if (msg.length === 0) {
            templateRes.push(tempValue);
            successRes.push({ ...tempValue, line: index + 2 });
        } else {
            message[`Line ${index + 2}`] = {  ...val, message: msg };
        }
    });

    return { result: successRes, templateResult: templateRes, message };
}

export function zeroFill(len, number) {
    const zVal = String(10 ** (len - String(number + '').length));
    const zeros = zVal.slice(1, zVal.length);
    return zeros + number;
}

export function parseDateTimeZoneString(date, time, timezone) {
    let timeArray;
    let array;

    const dateArray = date.split('.');
    let timeZoneString = timezone;
    if (timezone.includes(':')) {
        timeZoneString = timezone.split(':')[0];
    }

    let hr;
    let min;
    // 2011-10-10T14:48:00.000+09:00
    if (time.includes('P')) {
        array = time.split('P');
        timeArray = array[0].split(':');
        hr = parseInt(timeArray[0], 10) + 12;
        min = parseInt(timeArray[1], 10);
    } else {
        array = time.split('A');
        timeArray = array[0].split(':');
        hr = parseInt(timeArray[0], 10);
        min = parseInt(timeArray[1], 10);
    }

    return `${zeroFill(4, dateArray[2])}-${zeroFill(2, dateArray[1])}-${zeroFill(2, dateArray[0])}T${zeroFill(2, hr)}:${zeroFill(2, min)}:00.000+${zeroFill(2, timeZoneString)}:00`;
}

export function trim(value) {
    if (value && typeof value === 'string') {
        return value.trim();
    }
    return value;
}

export function arrangeCSVToJson(buffer) {
    const arr = buffer.split('\n');
    const data = [];
    const headers = arr[0].split(',');

    for (let i = 1; i < arr.length; i++) {
        const csvStr = arr[i].split(',');
        const obj = {};
        for (let j = 0; j < csvStr.length; j++) {
            if (headers[j] !== undefined) {
                obj[headers[j].trim()] = csvStr[j].trim();
            }
        }

        if (csvStr.length > 1) {
            data.push(obj);
        }
    }

    return data;
}