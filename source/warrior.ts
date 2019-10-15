import { Character } from './character'
import { MonsterName, Entity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Warrior extends Character {
    targetPriority: MonsterName[] = [
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "porcupine", "squigtoad", "croc", "rat", "minimush", "armadillo", "squig", "poisio", "crabx", "arcticbee", "bat", // #3: Easy to kill monsters
        "scorpion", "tortoise", "spider", "cgoo", "stoneworm", "boar", "iceroamer", // #2: Not that easy to kill, but killable monsters
        "goldenbat", "snowman", "mrgreen", "mrpumpkin", // #1: Event monsters
    ];
    mainTarget: MonsterName = "poisio";

    run(): void {
        super.run();
        this.chargeLoop();
    }

    mainLoop(): void {
        super.mainLoop();

        // Movement
        super.avoidAggroMonsters();
        super.avoidAttackingMonsters();
        super.moveToMonsters();

        transferItemsToMerchant("earthMer");
        transferGoldToMerchant("earthMer");
        sellUnwantedItems();
    }

    chargeLoop(): void {
        use_skill("charge")
        setTimeout(() => { this.chargeLoop() }, Math.max(250, parent.next_skill["charge"] - Date.now()));
    }
}

let warrior = new Warrior();
export { warrior }