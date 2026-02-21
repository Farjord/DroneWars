My game has gotten rather large and complex, and I am concerned that we have a lot of technical debt introduced into the system that is making it hard to expand upon. 

Some files are extremely large and need a review to see if we can split them down further:
•	App.jsx
•	ActionProcessor.js
•	InventoryModal.jsx
•	TacticalMapScreen.jsx
•	DeckBuilder.jsx
•	HangarScreen.jsx
•	TacticalMapScreen.test.jsx
•	TacticalMapScreen.waypointPreservation.test.jsx
Some files are not broken down as much as they could be:
•	aiLogic.js (AI logic should already be split out in to smaller files as part of C:\Drone-Wars-Game\drone-wars-game\src\logic\ai)

Targeting is becoming complicated and inconsistent. Especially since introducing drag and drop targeting. We need a complete review of this process to make sure that it is consistent across the board. 

Tests are not all in the same place – some in the related route folders, some in separate test folders. 
We need some standards to the controlling of code, and some best practices enabled. No file should be more than 50kb / however many lines before you cannot read the file. 

As a starting point we need to review the whole structure of the code base and agree a best practice, given the mess we are currently in. I want files to be small and targeted, not monolithic. I want clear data structures and file structures. I want consistency of tests. And most importantly I want to be able to have clear instructions for you in a .md file on how to maintain this, and an agent creating that enforces this structure as we are making changes. From here we can then target specific changes that we want to make to make sure that the code is clean, does not break, and is easy to maintain. 

Ideally I want to set up agents to support with this – investigations agents to trace through the code, but then agents who take the role of a technical architect who makes sure that every decision adheres to this new baseline, and then an agent who makes sure that all future changes are correctly documented as well. The folder we will be using for this work is C:\Drone-Wars-Game\drone-wars-game\Design\Technical Debt Refactor. All .MD files must be created in here. If we need to update your core CLAUDE.md file to be able to handle this task as well, that is OK to do. 

So your first task is to read this brief and then agree a plan on how we will introduce the framework for this task. 

