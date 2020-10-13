import moment from 'moment';
import {Match} from '../models/Match';
import {MatchUmpire} from '../models/MatchUmpire';
import {StateTimezone} from "../models/StateTimezone";
import { convertMatchStartTimeByTimezone } from "../utils/TimeFormatterUtils";
let constants = require('../constants/Constants');

const getMatchSheetTemplate = (
  templateType: string = 'Fixtures',
  organisation: any,
  team1players: any[],
  team2players: any[],
  umpires: MatchUmpire[],
  match: Match,
  competitionTimezone: StateTimezone
) => {
  const team1PlayersRef = team1players.length < 15
    ? [...team1players, ...Array(15 - team1players.length).fill(null)]
    : team1players;
  const team2PlayersRef = team2players.length < 15
    ? [...team2players, ...Array(15 - team2players.length).fill(null)]
    : team2players;

  const matchDate = convertMatchStartTimeByTimezone(
            match.startTime, competitionTimezone != null ? competitionTimezone.timezone : null,
            `${constants.DATE_FORMATTER_KEY}`);

  const matchStartTime = convertMatchStartTimeByTimezone(
        match.startTime, competitionTimezone != null ? competitionTimezone.timezone : null,
        `${constants.TIME_FORMATTER_KEY}`);

  return `
    <!doctype html>
    <html>
       <head>
          <meta charset="utf-8">
          <title>PDF Template</title>
          <style>
          @media print {
             body {
                width: 100%;
             }
             .no-break {
               page-break-inside: avoid;
             }
             ${templateType !== 'Simple' ? (
             `.page {
                width: 100%;
                max-width: 800px;
                padding: 16px;
                background-color: #FFFFFF;
                box-sizing: border-box;
                page-break-before:avoid;
             }
             .document {
                width: 100%;
             }
             .header {
                padding: 0 16px;
                margin-bottom: 8px;
                width: 100%;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                justify-content: space-between;
                box-sizing: border-box;
             }
             .associationName {
                font-size: 14px;
                font-weight: bold;
                padding: 8px 0;
                box-sizing: border-box;
             }
             .templateType {
                font-size: 12px;
             }
             .title {
                width: 50%;
             }
             .logo {
                width: 50px;
                height: 50px;
                margin-left: auto;
                margin-right: 16px;
             }
             .matchInfo {
                padding: 8px 16px;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                box-sizing: border-box;
             }
             .infoContentLeft {
                width: 50%;
                box-sizing: border-box;
             }
             .infoContentRight {
                width: 50%;
                padding-left: 8px;
                box-sizing: border-box;
             }
             .infodiv {
                 font-size: 9px;
                 margin-bottom: 4px;
             }
             .tableContent {
                width: 100%;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                box-sizing: border-box;
             }
             .signTable {
                width: 49%;
                padding: 0 16px;
                box-sizing: border-box;
             }
             .table {
                border: 1px solid black;
                border-right: 0;
                border-bottom: 0;
             }
             .row {
                width: 100%;
                height: 10px;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                font-size: 6px;
                border-bottom: 1px solid black;
                border-right: 1px solid black;
             }
             .cell:not(:last-child) {
                border-right: 1px solid black;
             }
             .cell {
                width: 7.92%;
                padding-top: 2px;
                text-align: center;
             }
             .largeCell {
                width: 28.7%;
                padding-top: 2px;
                border-right: 1px solid black;
                text-align: center;
             }
             .subTitle {
                padding: 6px 9px 4px 16px;
                font-size: 9px;
                box-sizing: border-box;
             }
             .passCell:not(:last-child) {
                border-right: 1px solid black;
             }
             .passCell {
                width: 2.308%;
                text-align: center;
             }
             .passTable {
                width: 100%;
                padding-left: 16px;
                padding-right: 24px;
                box-sizing: border-box;
             }
             .passTable .table {
                border-right: 1px solid black;
             }
             .passRow {
                width: 100%;
                height: 12px;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                font-size: 9px;
                border-bottom: 1px solid black;
             }
             .scoreTableRight {
                width: 50%;
                padding: 4px 24px 4px 8px;
                box-sizing: border-box;
             }
             .scoreTableLeft {
                width: 50%;
                padding: 4px 8px 4px 16px;
                border-right: 1px solid black;
                box-sizing: border-box;
             }
             .scoreCell {
                width: 5%;
                text-align: center;
             }
             .scoreRow {
                width: 100%;
                height: 12px;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                font-size: 7px;
             }
             .tableTitle {
                font-size: 9px;
                margin-bottom: 12px;
             }
             .summaryTable {
                width: 100%;
                padding: 4px 24px 4px 16px;
                box-sizing: border-box;
             }
             .summaryRow {
                width: 100%;
                height: 15px;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                font-size: 9px;
                border-bottom: 1px solid black;
             }
             .summaryCell {
                width: 28%;
                padding-left: 12px;
                padding-top: 2px;
                box-sizing: border-box;
             }
             .gapCell {
                width: 3.8%;
                border-right: 1px solid black;
                text-align: center;
             }
             .signatureCell {
                width: 20%;
                padding-top: 2px;
                border-right: 1px solid black;
                box-sizing: border-box;
             }
             .voteCell {
                width: 20%;
                padding-left: 12px;
                padding-top: 2px;
                border-right: 1px solid black;
                box-sizing: border-box;
             }
             .teamCell {
                width: 40%;
                padding-left: 12px;
                padding-top: 2px;
                border-right: 1px solid black;
                box-sizing: border-box;
             }
             .goalTable {
                width: 100%;
                padding: 8px 24px 8px 16px;
                box-sizing: border-box;
             }
             .goalTable .table {
                border-right: 1px solid black;
             }
             .goalRow {
                width: 100%;
                height: 24px;
                display: -webkit-box;
                display: -webkit-flex;
                -webkit-flex-wrap: wrap;
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                font-size: 8px;
                border-bottom: 1px solid black;
             }
             .goalCell {
                width: 5.85%;
                border-right: 1px solid black;
                text-align: center;
             }
             .goalCheckCell {
                width: 29%;
                border-right: 1px solid black;
             }
             .goalSubCell {
                height: 12px;
                text-align: center;
                border-bottom: 1px solid black;
             }
           }`
           ) : (
            `body {
                font-family: Arial
             }
            .page {
               width: 100%;
               max-width: 800px;
               padding: 40px 2px 2px 2px;
               background-color: #FFFFFF;
               box-sizing: border-box;
               page-break-before:avoid;
            }
            .document {
               width: 100%;
            }
            .header {
               padding: 0 16px;
               margin-bottom: 8px;
               width: 100%;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               justify-content: space-between;
               box-sizing: border-box;
            }
            .associationName {
               font-size: 14px;
               font-weight: bold;
               padding: 8px 0;
               box-sizing: border-box;
            }
            .templateType {
               font-size: 12px;
            }
            .title {
               width: 50%;
            }
            .logo {
               width: 50px;
               height: 50px;
               margin-left: auto;
               margin-right: 16px;
            }
            .matchInfo {
               padding: 8px 16px;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               box-sizing: border-box;
            }
            .infoContentLeft {
               width: 50%;
               box-sizing: border-box;
            }
            .infoContentRight {
               width: 50%;
               padding-left: 8px;
               box-sizing: border-box;
            }
            .infodiv {
                font-size: 12px;
                margin-bottom: 4px;
            }
            .tableContent {
               width: 100%;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               box-sizing: border-box;
            }
            #attendance1 {
               width: 49%;
               padding: 0 0 0 16px;
               box-sizing: border-box;
            }
            #attendance2 {
                width: 49%;
                padding: 0 16px 0 4px;
                box-sizing: border-box;
            }
            .table {
               border: 1px solid black;
               border-right: 0;
               border-bottom: 0;
            }
            .row {
               width: 100%;
               height: 20px;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               font-size: 12px;
               border-bottom: 1px solid black;
               border-right: 1px solid black;
            }
            #quarter1 {
               border-right: 1px solid black;
            }
            .cell {
               width: 8.54%;
               padding-top: 2px;
               text-align: center;
            }
            .largeCell {
               padding-top: 2px;
               padding-left: 2px;
               border-right: 1px solid black;
               text-align: left;
            }
            #signature {
                width: 20%;
            }
            #player {
                width: 60%;
            }
            #playerid, #quarter3, #quarter4 {
                display: none;
                width: 0%;
            }
            .subTitle {
               padding: 10px 9px 4px 16px;
               font-size: 12px;
               box-sizing: border-box;
            }
            .passCell:not(:last-child) {
               border-right: 1px solid black;
            }
            .passCell {
               width: 2.308%;
               text-align: center;
            }
            .passTable {
               width: 100%;
               padding-left: 16px;
               padding-right: 24px;
               box-sizing: border-box;
            }
            .passTable .table {
               border-right: 1px solid black;
            }
            .passRow {
               width: 100%;
               height: 12px;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               font-size: 9px;
               border-bottom: 1px solid black;
            }
            .scoreTableRight {
               width: 50%;
               padding: 4px 24px 4px 8px;
               box-sizing: border-box;
            }
            .scoreTableLeft {
               width: 50%;
               padding: 4px 8px 4px 16px;
               border-right: 1px solid black;
               box-sizing: border-box;
            }
            .scoreCell {
               width: 10%;
               text-align: center;
            }
            .scoreRow {
               width: 100%;
               height: 20px;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               font-size: 16px;
            }
            .tableTitle {
               font-size: 9px;
               margin-bottom: 12px;
            }
            .summaryTable {
               width: 100%;
               padding: 16px 24px 4px 16px;
               box-sizing: border-box;
            }
            .summaryRow {
               width: 100%;
               height: 36px;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               font-size: 12px;
               border-bottom: 1px solid black;
            }
            .summaryCell {
               width: 28.5%;
               padding-left: 12px;
               padding-top: 2px;
               box-sizing: border-box;
            }
            .gapCell {
               width: 0.8%;
               border-right: 1px solid black;
               text-align: center;
            }
            .signatureCell {
               width: 21%;
               padding-top: 2px;
               border-right: 1px solid black;
               box-sizing: border-box;
            }
            .voteCell {
               width: 20%;
               padding-left: 12px;
               padding-top: 2px;
               border-right: 1px solid black;
               box-sizing: border-box;
            }
            .teamCell {
               width: 40%;
               padding-left: 12px;
               padding-top: 2px;
               border-right: 1px solid black;
               box-sizing: border-box;
            }
            .goalTable {
               width: 100%;
               padding: 8px 24px 8px 16px;
               box-sizing: border-box;
            }
            .goalTable .table {
               border-right: 1px solid black;
            }
            .goalRow {
               width: 100%;
               height: 24px;
               display: -webkit-box;
               display: -webkit-flex;
               -webkit-flex-wrap: wrap;
               display: flex;
               flex-wrap: wrap;
               flex-direction: row;
               font-size: 8px;
               border-bottom: 1px solid black;
            }
            .goalCell {
               width: 5.85%;
               border-right: 1px solid black;
               text-align: center;
            }
            .goalCheckCell {
               width: 29%;
               border-right: 1px solid black;
            }
            .goalSubCell {
               height: 12px;
               text-align: center;
               border-bottom: 1px solid black;
            }
            #scorers {
               display:none;
            }
          }`
          )}
          </style>
       </head>
       <body>
          <div class="page no-break">
            <div class="header no-break">
                <div class="title">
                    <div class="associationName">${organisation.name || 'Association'}</div>
                    <div class="templateType">${templateType} Scoresheet</div>
                </div>
                <img class="logo" src="${organisation.logoUrl || "https://img.icons8.com/color/myspace"}"/>
            </div>
            <div class="matchInfo no-break">
                <div class="infoContentLeft">
                    <div class="infodiv">${match.round ? match.round.name : ''} - Court ${match.venueCourt?match.venueCourt.courtNumber:""}</div>
                    <div class="infodiv">${match.venueCourt && match.venueCourt.venue ? match.venueCourt.venue.name : ''}</div>
                    <div class="infodiv">${match.team1 ? match.team1.name : ''}</div>
                </div>
                <div class="infoContentRight">
                    <div class="infodiv">Date: ${matchDate}</div>
                    <div class="infodiv">Time: ${matchStartTime}</div>
                    <div class="infodiv">${match.team2 ? match.team2.name : ''}</div>
                </div>
            </div>
            ${templateType !== 'Carnival' ? (
                `<div class="tableContent">
                    <div class="signTable" id="attendance1">
                        <div class="table">
                            <div class="row">
                                <div class="cell" id="playerid">#</div>
                                <div class="largeCell" id="player">Player Name</div>
                                <div class="largeCell" id="signature">Signature</div>
                                <div class="cell" id="quarter1">1</div>
                                <div class="cell" id="quarter2">2</div>
                                <div class="cell" id="quarter3">3</div>
                                <div class="cell" id="quarter4">4</div>
                            </div>
                            ${team1PlayersRef.length > 0 ? team1PlayersRef.map((player, index) => (
                                `<div class="row">
                                    <div class="cell" id="playerid">${player && player.playerId || ''}</div>
                                    <div class="largeCell" id="player">${player && player.firstName || ''} ${player && player.lastName || ''}</div>
                                    <div class="largeCell" id="signature"></div>
                                    <div class="cell" id="quarter1"></div>
                                    <div class="cell" id="quarter2"></div>
                                    <div class="cell" id="quarter3"></div>
                                    <div class="cell" id="quarter4"></div>
                                </div>`
                            )).join('') : ''}
                        </div>
                    </div>
                    <div class="signTable" id="attendance2">
                        <div class="table">
                            <div class="row">
                                <div class="cell" id="playerid">#</div>
                                <div class="largeCell" id="player">Player Name</div>
                                <div class="largeCell" id="signature">Signature</div>
                                <div class="cell" id="quarter1">1</div>
                                <div class="cell" id="quarter2">2</div>
                                <div class="cell" id="quarter3">3</div>
                                <div class="cell" id="quarter4">4</div>
                            </div>
                            ${team2PlayersRef.length > 0 ? team2PlayersRef.map((player, index) => (
                                `<div class="row">
                                    <div class="cell" id="playerid">${player && player.playerId || ''}</div>
                                    <div class="largeCell" id="player">${player && player.firstName || ''} ${player && player.lastName || ''}</div>
                                    <div class="largeCell" id="signature"></div>
                                    <div class="cell" id="quarter1"></div>
                                    <div class="cell" id="quarter2"></div>
                                    <div class="cell" id="quarter3"></div>
                                    <div class="cell" id="quarter4"></div>
                                </div>`
                            )).join('') : ''}
                        </div>
                    </div>
                </div>`
            ) : ''}
            ${templateType !== 'Simple' ? (
            `<div class="subTitle">Centre Pass</div>
            <div class="tableContent">
                <div class="passTable">
                    <div class="table">
                        ${[...Array(4).keys()].map((rowIndex) => (
                           `<div class="passRow">
                              ${[...Array(40).keys()].map((cellIndex) => (
                                  `<div class="passCell"></div>`
                              )).join('')}
                            </div>`
                        )).join('')}
                    </div>
                </div>
            </div>`
            ) : ''}
            ${templateType !== 'Simple' ? (
            `<div class="subTitle">Progressive Score</div>
            <div class="tableContent">
                <div class="scoreTableLeft">
                    <div class="tableTitle">Team 1</div>
                    ${[...Array(4).keys()].map((rowIndex) => (
                        `<div class="scoreRow">
                          ${[...Array(20).keys()].map((cellIndex) => (
                              `<div class="scoreCell">${cellIndex + 1 + 20 * rowIndex}</div>`
                            )).join('')}
                        </div>`
                    )).join('')}
                </div>
                <div class="scoreTableRight">
                    <div class="tableTitle">Team 2</div>
                    ${[...Array(4).keys()].map((rowIndex) => (
                        `<div class="scoreRow">
                            ${[...Array(20).keys()].map((cellIndex) => (
                                `<div class="scoreCell">${cellIndex + 1 + 20 * rowIndex}</div>`
                            )).join('')}
                        </div>`
                    )).join('')}
                </div>
            </div>`
            ) : (
                `<div class="subTitle">Progressive Score</div>
                <div class="tableContent">
                    <div class="scoreTableLeft">
                        <div class="tableTitle">Team 1</div>
                        ${[...Array(4).keys()].map((rowIndex) => (
                            `<div class="scoreRow">
                              ${[...Array(10).keys()].map((cellIndex) => (
                                  `<div class="scoreCell">${cellIndex + 1 + 10 * rowIndex}</div>`
                                )).join('')}
                            </div>`
                        )).join('')}
                    </div>
                    <div class="scoreTableRight">
                        <div class="tableTitle">Team 2</div>
                        ${[...Array(4).keys()].map((rowIndex) => (
                            `<div class="scoreRow">
                                ${[...Array(10).keys()].map((cellIndex) => (
                                    `<div class="scoreCell">${cellIndex + 1 + 10 * rowIndex}</div>`
                                )).join('')}
                            </div>`
                        )).join('')}
                    </div>
                </div>`
            ) }
            ${templateType !== 'Social' && templateType !== 'Simple'  ? (
                `<div>
                    <div class="subTitle">Goal Statistics</div>
                    <div class="tableContent">
                        <div class="goalTable">
                            <div class="table">
                                ${[...Array(4).keys()].map((rowIndex) => (
                                    `<div class="goalRow">
                                        <div class="goalCell">
                                            <div class="goalSubCell">Q ${rowIndex + 1}</div>
                                            <div></div>
                                        </div>
                                        <div class="goalCell">
                                            <div class="goalSubCell">GS</div>
                                            <div>GA</div>
                                        </div>
                                        <div class="goalCheckCell">
                                            <div class="goalSubCell"></div>
                                            <div></div>
                                        </div>
                                        <div class="goalCell">
                                            <div class="goalSubCell"></div>
                                            <div></div>
                                        </div>
                                        <div class="goalCell"></div>
                                        <div class="goalCell">
                                            <div class="goalSubCell">GS</div>
                                            <div>GA</div>
                                        </div>
                                        <div class="goalCheckCell">
                                            <div class="goalSubCell"></div>
                                            <div></div>
                                        </div>
                                        <div class="goalCell">
                                            <div class="goalSubCell"></div>
                                            <div></div>
                                        </div>
                                        <div class="goalCell"></div>
                                    </div>`
                                )).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="subTitle">MVP</div>
                    <div class="tableContent">
                        <div class="summaryTable">
                            <div class="table">
                                <div class="summaryRow">
                                    <div class="voteCell">3 Votes</div>
                                    <div class="teamCell">Name</div>
                                    <div class="teamCell">Team</div>
                                </div>
                                <div class="summaryRow">
                                    <div class="voteCell">2 Votes</div>
                                    <div class="teamCell">Name</div>
                                    <div class="teamCell">Team</div>
                                </div>
                                <div class="summaryRow">
                                    <div class="voteCell">1 Votes</div>
                                    <div class="teamCell">Name</div>
                                    <div class="teamCell">Team</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`
            ) : ''}
            <div class="tableContent">
                <div class="summaryTable">
                    <div class="table">
                        <div class="summaryRow" id="scorers">
                            <div class="summaryCell">
                                Scorer 1
                            </div>
                            <div class="signatureCell">Signature</div>
                            <div class="gapCell"></div>
                            <div class="summaryCell">
                                Scorer 2
                            </div>
                            <div class="signatureCell">Signature</div>
                        </div>
                        <div class="summaryRow">
                            <div class="summaryCell">Umpire</div>
                            <div class="signatureCell">Signature</div>
                            <div class="gapCell"></div>
                            <div class="summaryCell">Umpire</div>
                            <div class="signatureCell">Signature</div>
                        </div>
                        <div class="summaryRow">
                            <div class="summaryCell">Captain</div>
                            <div class="signatureCell">Signature</div>
                            <div class="gapCell"></div>
                            <div class="summaryCell">Captain</div>
                            <div class="signatureCell">Signature</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
       </body>
    </html>
    `;
};

export default getMatchSheetTemplate;
