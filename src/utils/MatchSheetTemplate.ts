import moment from 'moment';

import {LinkedCompetitionOrganisation} from '../models/LinkedCompetitionOrganisation';
import {Match} from '../models/Match';
import {MatchUmpire} from '../models/MatchUmpire';

const getMatchSheetTemplate = (
  templateType: string = 'Fixtures',
  competitionOrganisation: LinkedCompetitionOrganisation,
  team1players: any[],
  team2players: any[],
  umpires: MatchUmpire[],
  match: Match
) => {
  const team1PlayersRef = team1players.length < 15
    ? [...team1players, ...Array(15 - team1players.length).fill(null)]
    : team1players;
  const team2PlayersRef = team2players.length < 15
    ? [...team2players, ...Array(15 - team2players.length).fill(null)]
    : team2players;

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
             .page {
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
           }
          </style>
       </head>
       <body>
          <div class="page no-break">
            <div class="header no-break">
                <div class="title">
                    <div class="associationName">${competitionOrganisation.name || 'Association'}</div>
                    <div class="templateType">${templateType} Scoresheet</div>
                </div>
                <img class="logo" src="${competitionOrganisation.logoUrl || "https://img.icons8.com/color/myspace"}"/>
            </div>
            <div class="matchInfo no-break">
                <div class="infoContentLeft">
                    <div class="infodiv">${match.round ? match.round.name : ''}</div>
                    <div class="infodiv">${match.venueCourt && match.venueCourt.venue ? match.venueCourt.venue.name : ''}</div>
                    <div class="infodiv">${match.team1 ? match.team1.name : ''}</div>
                </div>
                <div class="infoContentRight">
                    <div class="infodiv">Date: ${moment(new Date(match.startTime)).format('DD/MM/YYYY')}</div>
                    <div class="infodiv">Time: ${moment(new Date(match.startTime)).format('HH:MM a')}</div>
                    <div class="infodiv">${match.team2 ? match.team2.name : ''}</div>
                </div>
            </div>
            ${templateType !== 'Carnival' ? (
                `<div class="tableContent">
                    <div class="signTable">
                        <div class="table">
                            <div class="row">
                                <div class="cell">#</div>
                                <div class="largeCell">Player Name</div>
                                <div class="largeCell">Signature</div>
                                <div class="cell">1</div>
                                <div class="cell">2</div>
                                <div class="cell">3</div>
                                <div class="cell">4</div>
                            </div>
                            ${team1PlayersRef.length > 0 ? team1PlayersRef.map((player, index) => (
                                `<div class="row">
                                    <div class="cell">${player && player.playerId || ''}</div>
                                    <div class="largeCell">${player && player.firstName || ''} ${player && player.lastName || ''}</div>
                                    <div class="largeCell"></div>
                                    <div class="cell"></div>
                                    <div class="cell"></div>
                                    <div class="cell"></div>
                                    <div class="cell"></div>
                                </div>`
                            )).join('') : ''}
                        </div>
                    </div>
                    <div class="signTable">
                        <div class="table">
                            <div class="row">
                                <div class="cell">#</div>
                                <div class="largeCell">Player Name</div>
                                <div class="largeCell">Signature</div>
                                <div class="cell">1</div>
                                <div class="cell">2</div>
                                <div class="cell">3</div>
                                <div class="cell">4</div>
                            </div>
                            ${team2PlayersRef.length > 0 ? team2PlayersRef.map((player, index) => (
                                `<div class="row">
                                    <div class="cell">${player && player.playerId || ''}</div>
                                    <div class="largeCell">${player && player.firstName || ''} ${player && player.lastName || ''}</div>
                                    <div class="largeCell"></div>
                                    <div class="cell"></div>
                                    <div class="cell"></div>
                                    <div class="cell"></div>
                                    <div class="cell"></div>
                                </div>`
                            )).join('') : ''}
                        </div>
                    </div>
                </div>`
            ) : ''}
            <div class="subTitle">Centre Pass</div>
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
            </div>
            <div class="subTitle">Progressive Score</div>
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
            </div>
            ${templateType !== 'Social' ? (
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
                        <div class="summaryRow">
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
