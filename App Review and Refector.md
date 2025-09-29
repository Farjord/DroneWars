# Drone Wars - Review of App.jsx

App.jsx is an old file that used to be the monolythic control of all aspects of the game -> UI, Logic, AI, Processing. 
Over time we've been working on refcatoring this file, improving the archetecture, and getting the game ready for multiplayer. (See CLAUDE.md for details)

I am now concerend that as we've been refactoring, the App.jsx file is rather a mess.
**Things are in the file in an unstrucutred format. There is no logical flow**

I want you to systematically review the file, line by line, and confirm whether each line is in the right place in the file. I apprecaite you will not be able to do this in one go, so below is a play to be able to do this systematically and thorougly. 

- Firstly, create an ideal file strucutre format. App.jsx must have headers for each section, describing what they do. 
- Create / Update that structure in CLAUDE.md

Then, as you go though App.jsxplease do the following:
- Start off from where you last left off by looking for the 'REVIEWED TO HERE' comment. 
- Make sure the file is properly structured. 
- Flag any code that needs to be moved. 
- Where possible, move the code. 
- After you have completed your analysis add a comment stating 'REVIEWED TO HERE - DD/MM/YYYY HH:MM' in the code on the line after where you have got up to. Remove the revious REVIEWED TO HERE comment. 
