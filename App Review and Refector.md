# Drone Wars - Review of App.jsx

App.jsx is an old file that used to be the monolythic control of all aspects of the game -> UI, Logic, AI, Processing. 
Over time we've been working on refcatoring this file, improving the archetecture, and getting the game ready for multiplayer. (See CLAUDE.md for details)

I am now concerend that as we've been refactoring, the App.jsx file is rather a mess.
**Things are in the file in an unstrucutred format. There is no logical flow**
**There is unused code and orphaned items**
**There are still UI components in the file -these must be split out**
**There may be locical processes in the file that try to update the GameStateManager. THIS MUST NOT BE THE CASE**

I want you to systematically review the file, line by line, and confirm whether each line is in the right place in the file, used by the file, correct to be in the file and doesn't break any archetectural rules. I apprecaite you will not be able to do this in one go, so below is a play to be able to do this systematically and thorougly. 

As you go though the file please do the following:
- Start off from where you last left off by looking for the 'REVIEWED TO HERE' comment. 
- Make sure the file is properly structured. Create an ideal structure in this document, and make sure that the App.jsx keeps to it by moving code as required. 
- Make sure you understand the archetecutre, based off CLAUDE.md.
- Systemtically go through the code, reviewing each block, and checking for the following:
- Where there are UI components, flag them with a comment stating that the component needs to be removed. Do not remove any code at this time. 
- Where the file performs an update, flag them with a comment stating that the component needs to be reviewed. Do not remove any code at this time. 
- Where code is inno longer used, flag them with a comment stating that the component needs to be removed. Do not remove any code at this time. 
- Where code is in the wrong place, move the code to the correct part of the file. 
- After you have completed your analysis add a comment stating 'REVIEWED TO HERE - DD/MM/YYYY HH:MM' in the code on the line after where you have got up to. Remove the revious REVIEWED TO HERE comment. 