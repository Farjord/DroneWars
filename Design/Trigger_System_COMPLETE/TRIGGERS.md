# REVIEW OF TRIGGERS

I want to review how TRIGGERS work in the game. 

Triggers are on drones, as drones are the permanent features that players add to the board. Drones can be Tokens and normal. 

We have triggers defined already; however, they are not consistent. They have been merged across multiple different effect types, making it inconsistent in the code and in the creation of drones. These are the drones with existing TRIGGER effects that I believe need to be considered:
- Firefly – AFTER ATTACK (note - not a triggered effect)
- Gladiator – AFTER ATTACK (note - not a triggered effect)
- Specter – ON_MOVE
- Osiris – ON_MOVE
- Scanner – ON_DEPLOY
- Signal Beacon – ON_ROUND_START
- Threat Transmitter – ON_ATTACK
- War Machine – ON_ROUND_START
- Rally Beacon - RALLY_BEACON
- Proximity Mine - ON_LANE_MOVEMENT_IN
- Inhibitor Mine - ON_LANE_DEPLOYMENT
- Jitter Mine - ON_LANE_ATTACK
- Odin – ON_CARD_DRAWN
- Thor – ON_ENERGY_GAINED

Of these, AFTER ATTACK and RALLY_BEACON need deprecating and replacing with Triggered effects. 

So the condensed triggers we have are:
# Drone specific triggers:
- ON_MOVE – the drone itself moves
- ON_DEPLOY – the drone itself is deployed
- ON_ROUND_START – the drone is on the board at the start of the round. The effect triggers. 
- ON_ATTACK – The drone itself attacks
- ON_CARD_DRAWN – The controlling player draws a card during the action phase. 
- ON_ENERGY_GAINED – The controlling player gains energy during the action phase. 
# Triggers from other actions in a drones lane:
- ON_LANE_MOVEMENT_IN – another drone moves into this drone’s lane. 
- ON_LANE_DEPLOYMENT – another drone is deployed to this drone’s lane. 
- ON_LANE_ATTACK – another drone attacks in this drones lane. 
- (We also need to add ON_LANE_MOVEMENT_OUT for completeness)

# TRIGGERED EFFECTS
Triggers then need to be able to apply any and all effect that we have in our game, in exactly the same way as they would be applied if a card was played. So, the ‘effects’ potion of a trigger needs to work exactly the same as the effects of an action card. However, we must never have multi stage triggers (such as selecting additional targets based on conditions like in the Reposition card). Though that is more of a design concern that a code one.  
Certain Triggers also need to be able to support a new concept of ‘sub-types’. For example, the TRIGGER type ON_CARD_PLAY could have a sub-trigger of CARD_TYPE or CARD_SUB_TYPE. Card sub type being a new tag that we need to add to action cards. This means that cards will have a ‘Type’ of Support, Ordnance etc, and then a ‘sub-type’ of user defined keywords. For now, I want to add the sub-type ‘Mine’, which I will then add to every card that has ‘Mine’ in its title. Sometimes these ON_CARD_PLAY triggers will be global, sometimes restricted to the lane that the drone is in. 

So, a new drone will be ‘Anansi’ – CPU 2, Attack 1, Speed 2, Sheilds 2, Hull 2, Ability: When you play a ‘Mine’ is played in this lane, draw a card. 

The TRIGGER needs to be ON_CARD_PLAY, CARD_SUB_TYPE ‘Mine, Effect, Draw a Card. This also brings in a consideration of triggering of friendly or hostile actions, as this trigger is on friendly card plays. However, this is implied in the code and not explicit. I think it would be better to have this explicit. 

The TRIGGERS of ON_LANE_MOVEMENT_IN / ON_LANE_MOVEMENT_OUT, ON_LANE_DEPLOYMENT and ON_LANE_DEPLOYMENT all need to be able to filter on Drone stats as well, in the same way that cards do. So, for example, when a drone with a CPU of 2 is deployed, do ‘x’. 

# TIMINGS

We then need to consider timings of TRIGGERED effects, as multiple could happen simultaneously. An Osiris could have 1 hp left and move into a lane with a mine that has an ON_MOVE_IN trigger of deal 1 damage. Both the Osiris drone and the mine will trigger. The Osiris heals and the mine deals damage. What is the outcome? What I want to happen is them both happen simultaneously, so the Osiris is not destroyed since it is healed whilst taking damage. But I am keen to hear thoughts on this. How do other card games handle this? What makes sense given the constraints of our system?

There are also scenarios where one triggers could trigger another. We could have an effect where when a drone moves in to a lane a player draws a card. We could also have an Orion in that lane. So, the player moving a drone in draws a card of trigger 1, and that draw triggers the Orion’s ability. What we need to protect against here is circular infinite loops. Probably something like each trigger can only trigger once per action – though note I do not want this tracking in the UI. I am not sure that is the best solution here though, so I am open to discussing this. The Orion being hampered by not being able to combo off here feels pretty bad. Limits is another option, but these feel arbitrary? Let’s say I have another effect in this lane that says when a drone in this lane gains power draw 1 card. This effect and the Orion would combo off each other infinitely. This is my particular concern – how do other games address this? 

So, the actions are:
- Code Reviewer – review existing trigger abilities. Look for inefficiencies, dead code and bad logic. Refine and refactor based on these requirements. 
- Code Reviewer - Review and plan for triggers to be able to trigger all effects in the game. 
- Add ON_LANE_MOVEMENT_OUT trigger
- Add trigger sub filters, where applicable:
- - ON_CARD_PLAY – Type and Sub Type. 
- - Thiis requires that we define Type and Sub Type in the code – and also allow Sub Type to be an attribute of cards. Note my requirement to add it to all Mine cards. 
- Add the Anansi drone. 
- Add the ability to filter on drone stats in the ON_LANE_'X' triggers. 
- Add the ability to specify affected players by triggers - player or opponents. Review and update exisitng cards. 
- Consider the issues in the TIMINGS section. I am not looking for code solutions right now, more a conversation on these topics. 
- As ever, create comprehensive documentation to support these changes. A specific PRD.md document is needed, documenting the confirmed decisions and plan. 


