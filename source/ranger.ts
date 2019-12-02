import { Character } from './character'
import { MonsterName, Entity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 5000;

class Ranger extends Character {
    newTargetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": EASY
        },
        "armadillo": {
            "priority": EASY,
            "stopOnSight": true
        },
        "bat": {
            "priority": EASY,
            "stopOnSight": true
        },
        "bee": {
            "priority": EASY
        },
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": DIFFICULT,
            "holdAttack": true,
            "stopOnSight": true
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": DIFFICULT,
            "holdAttack": true,
            "stopOnSight": true,
        },
        "cgoo": {
            // Our plan is to go to a spot where we're far enough away from them, and then start attacking
            "holdAttack": true,
            "priority": DIFFICULT,
            "map": "arena",
            "x": 500,
            "y": -50
        },
        "crab": {
            "priority": EASY
        },
        "crabx": {
            // They can hurt, but they move really slow and they're pretty out of the way.
            "priority": MEDIUM
        },
        "croc": {
            "priority": EASY
        },
        "ghost": {
            "holdAttack": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "goldenbat": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "goo": {
            "priority": EASY,
        },
        "hen": {
            "priority": EASY
        },
        "iceroamer": {
            "holdAttack": true,
            "priority": DIFFICULT,
            "stopOnSight": true,
        },
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
        },
        "mrgreen": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "mrpumpkin": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "oneeye": {
            // Camp out at a spot that's 99% safe.
            "holdAttack": true,
            "holdPosition": true,
            "priority": DIFFICULT,
            "map": "level2w",
            "x": -120,
            "y": -100
        },
        "osnake": {
            "priority": EASY
        },
        "phoenix": {
            "priority": SPECIAL
        },
        "poisio": {
            "priority": EASY
        },
        "porcupine": {
            "priority": EASY
        },
        "prat": {
            // Go to a cliff where we can attack them, but they can't attack us.
            "holdAttack": true,
            "holdPosition": true,
            "priority": DIFFICULT,
            "map": "level1",
            "x": -296,
            "y": 557,
        },
        "rat": {
            "priority": EASY
        },
        "rooster": {
            "priority": EASY
        },
        "scorpion": {
            "priority": MEDIUM
        },
        "snake": {
            "priority": EASY
        },
        "snowman": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "spider": {
            "priority": MEDIUM
        },
        "squig": {
            "priority": EASY,
        },
        "squigtoad": {
            "priority": EASY
        },
        "stoneworm": {
            "holdAttack": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "tortoise": {
            "priority": EASY
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "priority": DIFFICULT,
            "holdAttack": true,
            "stopOnSight": true
        },
        "xscorpion": {
            "priority": DIFFICULT,
            "holdAttack": true,
            "map": "halloween",
            "x": -230,
            "y": 570
        }
    }
    mainTarget: MonsterName = "croc";

    run(): void {
        super.run();
        this.superShotLoop();
        this.huntersmarkLoop();
        // this.fourFingersLoop();
        // this.sendLootLoop();
    }

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko"]);
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();
            loot();

            this.createParty(["earthMag", "earthWar", "earthMer"]);

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    huntersmarkLoop(): void {
        try {
            let targets = this.getTargets(1);
            if (parent.character.mp < 240 // No MP
                || parent.next_skill["huntersmark"] > Date.now() // Not usable yet
                || targets.length == 0 // No targets
                || parent.character.stoned // Can't use skills
                || targets[0].s.marked
                || targets[0].hp < parent.character.attack * 5 // Target is easily killable
                || parent.distance(parent.character, targets[0]) > parent.character.range) { // Not in range
                // Do nothing
            } else {
                use_skill("huntersmark", targets[0])
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.huntersmarkLoop() }, Math.max(parent.character.ping, parent.next_skill["huntersmark"] - Date.now()));
    }

    fourFingersLoop(): void {
        try {
            let targets = this.getTargets(1);
            if (parent.character.mp > 260 // We have MP
                && targets.length > 0 // We have a target
                && !parent.character.stoned // Can use skills
                && distance(parent.character, targets[0]) <= 120 // The target is in range
                && targets[0].player
                && targets[0].target == parent.character.name // The target is targetting us
                && (
                    parent.character.hp < targets[0].attack * 10 // We don't have much HP
                )
            ) {
                use_skill("4fingers", targets[0].id)
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.fourFingersLoop() }, Math.max(parent.character.ping, parent.next_skill["4fingers"] - Date.now()));
    }

    superShotLoop(): void {
        let targets = this.getTargets(1);
        if (parent.character.mp < 400 // No MP
            || targets.length < 1 // No targets NOTE: Based on getTargets(2).
            || parent.character.stoned // Can't use skills
            || parent.distance(parent.character, targets[0]) > character.range * 3 // Out of range
            || parent.next_skill["supershot"] > Date.now() // Not usable yet
            || (this.holdAttack && targets[1].target != parent.character.name) // Holding attack (global)
            || (smart.moving && this.newTargetPriority[targets[0].mtype] && this.newTargetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name)) { // Holding attack (monster)
            // Do nothing
        } else {
            use_skill("supershot", targets[0])
        }

        setTimeout(() => { this.superShotLoop() }, Math.max(parent.character.ping, parent.next_skill["supershot"] - Date.now()));
    }

    attackLoop() {
        // TODO: Try to 5shot targets

        // Try to 3shot targets
        let targets = this.getThreeshotTargets();
        if (targets.length >= 3
            && parent.character.mp > 300 // Have MP
            && !parent.character.stoned // Can use skills
            && parent.next_skill["attack"] <= Date.now()
            && !(smart.moving && this.newTargetPriority[targets[0].mtype] && this.newTargetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name)) { // Holding attack and not being attacked
            // game_log("3shot!?")
            parent.socket.emit("skill", {
                name: "3shot",
                ids: [targets[0].id, targets[1].id, targets[2].id]
            });
            setTimeout(() => { this.attackLoop() }, Math.max(parent.character.ping, parent.next_skill["attack"] - Date.now()));
            return;
        }

        // Can't do a special attack, so let's do a normal one
        // game_log("normal attack")
        super.attackLoop();
    }

    getThreeshotTargets(): Entity[] {
        let targets: Entity[] = [];

        for (let id in parent.entities) {
            let entity = parent.entities[id];
            let d = distance(character, entity);
            if (entity.type != "monster") continue; // Not a monster
            if (!this.newTargetPriority[entity.mtype]) continue; // Not something we want to attack
            if (d > parent.character.range) continue; // Too far away
            if ((entity.target != parent.character.name) && (entity.hp > parent.character.attack * 0.7 * 0.9 * damage_multiplier(entity.armor - parent.character.apiercing))) continue; // Too much HP to kill in one shot & not targeting us.

            targets.push(entity);
        }

        return targets.slice(0, 3);
    }

    createParty(members: string[]): void {
        for (let member of members) {
            if (!parent.party[member])
                send_party_invite(member);
        }
    }
}

let ranger = new Ranger();
export { ranger }