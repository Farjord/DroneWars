cd C:\Drone-Wars-Game\drone-wars-game
npm run dev


BUGS TO FIX
AI - Don't play Out Think if the opponent has passed. 
AI - Got incorrect lethal bonus when using Armor-Piercing Shot
Upgrades - Show limit per card on the popup. 
AI - Chose to buff a card that didn't have a clear line of attack - both were valued the same. 
Avenger Drone - Not Triggering

?Still exists?
AI - targeting of damage cards is too low on the priority, especially if taking out high value, ready piece. Revisit. 
AI - Bomber only scoring 8 for attacking the bridge??



CARD018:4,CARD003:4,CARD002:4,CARD005:4,CARD012:4,CARD007:2,CARD004:4,CARD001:4,CARD023:4,CARD021:2,CARD020:2,CARD016:2


I am in the process of migrating my game so that it multiplayer compatible. This means moving core logic functions out of the app.jsx into gameLogic.js.

Can you advise me of the next step to undertake, please? 

I want to go through this one small step at a time, so please do not provide instructions for the entire refactor, just the next part to move. 

---------

Checking In a New Version (Saving Your Work)
This is the standard 3-step process to save your changes to GitHub.

$git add .$

Use: Prepares all your saved changes for the next commit.

$git commit -m "Your message here"$

Use: Saves your prepared changes as a new version with a descriptive message.

$git push$

Use: Uploads your new saved version (commit) to your GitHub repository.

Viewing & Restoring Old Versions
These commands let you look into the past and retrieve old code.

$git log$

Use: Shows the history of all your commits, with the newest at the top. Use this to find the commit hash (the unique ID) of an old version.

$git log --oneline$

Use: Shows a compact, one-line view of your commit history, which is much easier to read.

$git checkout <commit_hash>$

Use: Temporarily switches all your project files to an old version to look around.

To return to the present: $git checkout master$

$git checkout <commit_hash> -- path/to/file.js$

Use: Restores a single file from an old version without affecting any other files. You must commit this change afterwards.

$git revert <commit_hash>$

Use: Safely undoes a specific past commit by creating a new commit that reverses its changes. You must push this new "revert" commit afterwards.