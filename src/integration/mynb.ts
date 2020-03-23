import {logger} from '../logger';
import {Player} from "../models/Player";

require("dotenv").config();

const puppeteer = require('puppeteer');

const WON = 1;
const LOST = 2;
const DRAWN = 3;

const TIMEOUT = 40000;

async function login(page, mnbUrl: string, mnbUser: string, mnbPassword: string,) {
    await page.goto(mnbUrl);

    await page.type('#ctl00_MainPlaceHolder_ctl00_txtUsr', mnbUser);
    await page.type('#ctl00_MainPlaceHolder_ctl00_txtPwd', mnbPassword);

    const wait = page.waitForNavigation({timeout: TIMEOUT});
    await page.click('#ctl00_MainPlaceHolder_ctl00_Submit1');
    await wait;

    logger.info(`Logged into mynb`);
}

async function submitScore(mynetballMatchId: string,
                           team1Score: number,
                           team2Score: number,
                           mnbUrl: string,
                           mnbUser: string,
                           mnbPassword: string,) {

    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        headless: true
    });

    try {

        const page = await browser.newPage();
        page.on("dialog", (dialog) => {
            dialog.accept();
        });

        await login(page, mnbUrl, mnbUser, mnbPassword);

        // Submit the score.
        await page.goto(`${mnbUrl}/pages/admin/matchscore_12.aspx?&matchID=${mynetballMatchId}&popup=1`);

        // Version 1
        if (await page.$(`#ctl00_MainPlaceHolder_dlScores_ctl00_dg1_ctl06_tbScore_1`) !== null) {
            await type(page, '#ctl00_MainPlaceHolder_dlScores_ctl00_dg1_ctl06_tbScore_1', `${team1Score}`);
            await type(page, '#ctl00_MainPlaceHolder_dlScores_ctl01_dg1_ctl06_tbScore_1', `${team2Score}`);
        }

        // Version 2
        if (await page.$(`#ctl00_MainPlaceHolder_dlScores_ctl00_dg1_ctl04_tbScore_1`) !== null) {
            await type(page, '#ctl00_MainPlaceHolder_dlScores_ctl00_dg1_ctl04_tbScore_1', `${team1Score}`);
            await type(page, '#ctl00_MainPlaceHolder_dlScores_ctl01_dg1_ctl04_tbScore_1', `${team2Score}`);
        }

        await page.select('#ctl00_MainPlaceHolder_dlScores_ctl00_dlResultType', `${team1Score > team2Score ? WON : team1Score === team2Score ? DRAWN : LOST}`);
        await page.select('#ctl00_MainPlaceHolder_dlScores_ctl01_dlResultType', `${team2Score > team1Score ? WON : team2Score === team1Score ? DRAWN : LOST}`);
        const wait = page.waitForNavigation({timeout: TIMEOUT});
        await page.click('#ctl00_MainPlaceHolder_ucSave');
        await wait;

        logger.info(`Submitted MYNB score: ${team1Score} ${team2Score} to ${mynetballMatchId}`);

    } catch (err) {
        logger.error(`Error while submitting scores for match ${mynetballMatchId}`, err);
        throw Error(`Failed to submit scores to MyNetball.`);
    }

    browser.close();
}

async function submitAttendance(
    mynetballMatchId: string,
    team1Ids: string[],
    team2Ids: string[],
    mnbUrl: string,
    mnbUser: string,
    mnbPassword: string,
) {

    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        headless: true
    });

    try {

        // Construct a page.
        const page = await browser.newPage();
        page.on("dialog", (dialog) => {
            dialog.accept();
        });

        // Login
        await login(page, mnbUrl, mnbUser, mnbPassword);

        // Go to the attendance screen.
        await page.goto(`${mnbUrl}/pages/admin/playerscore_12.aspx?matchID=${mynetballMatchId}`);

        // Set team1.
        await setTeamIds(page, team1Ids);

        // Switch to the other team.
        const otherTeamOption = await page.evaluate(() => {
            return document.querySelector('#ctl00_MainPlaceHolder_dlTeam>option:not([selected])')['value'];
        });
        const wait = page.waitForNavigation({timeout: TIMEOUT});
        await page.select('#ctl00_MainPlaceHolder_dlTeam', otherTeamOption);
        await wait;

        // Set team1.
        await setTeamIds(page, team2Ids);

    } catch (err) {
        logger.error(`Error while submitting attendance for match ${mynetballMatchId}`, err);
        throw Error(`Failed to submit attendance to MyNetball.`);
    }

    browser.close();
}

function normalizeName(name: string) {
    if (name) {
        return name
            .replace(/,/g, '')
            .replace(/ /g, '')
            .toLowerCase();
    }
    return name;
}

async function setTeamIds(page, teamIds) {

    const players: any = await Promise.all(teamIds.map(async (teamId) => {
        return Player.findOne(teamId)
    }));
    const mnbPlayerIds = players.map(player => player.id);
    const names = players.map(player => normalizeName(player.lastName + player.firstName));

    // First, we ensure all players are added to the list using the "add player control."
    for (let i = 0; i < mnbPlayerIds.length; i++) {
        const mnbPlayerId = mnbPlayerIds[i];
        await page.click('#ctl00_MainPlaceHolder_butRefresh');
        await page.waitForSelector('#addplayer_dialog', {visible: true});
        const wait = page.waitForNavigation({timeout: TIMEOUT});
        await page.evaluate((mnbPlayerId) => {
            let select = document.querySelector('#ctl00_MainPlaceHolder_cboPlayerList');
            select['value'] = mnbPlayerId;
            return document.querySelector('#addplayer_dialog').nextSibling['querySelector']('button')['click']();
        }, mnbPlayerId);
        await wait;
    }

    // Then synchronize the checkbox state.
    await page.evaluate((names) => {

        // For each row...
        document.querySelectorAll('#ctl00_MainPlaceHolder_l_ctl01_g tr.RVDataGridItem').forEach((row) => {

            // Get a normalized player name.
            let name = row['cells'][0].querySelector('span').innerHTML;
            name = name
                .replace(/,/g, '')
                .replace(/ /g, '')
                .toLowerCase();

            // Should this player be checked?
            let checked = names.indexOf(name) > -1;

            // Should it be checked vs is it checked?
            let checkbox = row['cells'][1];
            if (checked != checkbox.querySelector('input')['checked']) {
                console.log('clicking ', name);
                const allLabels = checkbox.querySelectorAll('label');
                if (allLabels && allLabels.length > 0) {
                    allLabels[allLabels.length - 1]['click']();
                }
            } else {
                console.log('Not updating ' + name, checkbox.previousSibling['checked']);
            }
        })
    }, names);

    // Click save.
    const wait = page.waitForNavigation({timeout: TIMEOUT});
    await page.click('#ctl00_MainPlaceHolder_ucSave');
    await wait
}

async function type(page, selector, value) {
    await page.evaluate((selector, value) => {
        document.querySelector(selector).value = value;
    }, selector, value);
}

export {
    submitScore,
    submitAttendance
};
