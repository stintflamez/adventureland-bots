const merchant = "earthMer"

/*
const target = "prat"
const position = {
    "map": "level1",
    "x": -296.5,
    "y": 557.5
}
*/

/*
const target = "croc"
const position = {
    "map": "main",
    "x": 801,
    "y": 1710
}
*/

const target = "armadillo"
const position = {
    "map": "main",
    "x": 526,
    "y": 1846
}

/* ---- START PARTY STUFF ----- */
const node_https = parent.require('https');

function get_party_list() {
    const party_list_path = "https://raw.githubusercontent.com/egehanhk/ALStuff/master/gcta/gcta_groups.json";

    return new Promise((resolve, reject) => {
        const load_time = new Date();

        const request = node_https.get(party_list_path, function (response) {
            response.on('data', function (data) {
                try {
                    const party_lists = JSON.parse(data);
                    resolve(party_lists);
                } catch (e) {
                    console.error(e);
                    reject();
                    return;
                }
                game_log("Party list loaded. " + (new Date().getTime() - load_time) + " ms", "gray");
                return;
            });
        });
    });
}

let party_list = {};

function update_party_list() {
    get_party_list().then((party_lists) => {
        for (const group_name in party_lists) {
            if (character.name in party_lists[group_name]) {
                party_list = party_lists[group_name];
                break;
            }
        }
    }).catch(() => {
        game_log("Error retrieveing party lists", "red");
    });
}

update_party_list();
setInterval(update_party_list, 3600000); // every hour

// Handles incoming players list
function players_handler(event) {
    parent.player_list = event; // Party checking is done on this list
}

// Register event
parent.socket.on("players", players_handler);

// Request player list
setInterval(() => {
    parent.socket.emit("players");
}, 10000);

// "players" event from server will attempt to run the function load_server_list(). This is to prevent error since it's not defined in albot
function load_server_list() {}

setInterval(() => {
    // Find parties nearby and lonely dudes
    const parties_available = [];
    const loners = [];
    const process_player = (player) => {
        if (player.name in party_list) {
            if (player.party && character.party !== player.party) {
                // If they are in another party
                parties_available.push(player.party);
            } else if (!player.party) {
                // If they are not in party
                loners.push(player.name);
            }
        }
    }
    if (parent.player_list) { // Server player list available
        for (const player of parent.player_list) {
            process_player(player);
        }
    } else {
        for (const name in party_list) {
            if (name in parent.entities) {
                const player = parent.entities[name];
                process_player(player);
            }
        }
    }

    // Sort parties_available and join the alphabetically first party
    if (character.party) parties_available.push(character.party);
    parties_available.sort();
    if (parties_available.length && parties_available[0] !== character.party) {
        game_log("Left party to join " + parties_available[0] + "'s party", "gray");
        leave_party();
        send_party_request(parties_available[0]);
    } else if (loners.length) {
        // If not joining another party, send invites to characters not in party
        for (const i in loners) {
            send_party_invite(loners[i]);
        }
    }
}, 10000);

// For combining functions like on_destroy, on_party_invite, etc.
function combine_functions(fn_name, new_function) {
    if (!global[fn_name + "_functions"]) {
        global[fn_name + "_functions"] = [];
        if (global[fn_name]) {
            global[fn_name + "_functions"].push(global[fn_name]);
        }
        global[fn_name] = function () {
            global[fn_name + "_functions"].forEach((fn) => fn.apply(global, arguments));
        }
    }
    global[fn_name + "_functions"].push(new_function);
}

combine_functions("on_party_invite", function (name) {
    if (name in party_list) {
        accept_party_invite(name);
    }
});

combine_functions("on_party_request", function (name) {
    if (name in party_list) {
        accept_party_request(name);
    }
});
/* ----- END PARTY STUFF ----- */

function getCooldownMS(skill) {
    if (parent.next_skill && parent.next_skill[skill]) {
        const ms = parent.next_skill[skill].getTime() - Date.now()
        return ms < parent.character.ping ? parent.character.ping : ms
    } else {
        return parent.character.ping
    }
}

function getEntities({
    canAttackUsWithoutMoving,
    isAttacking,
    isAttackingParty,
    isAttackingUs,
    isCtype,
    isMonster,
    isMonsterType,
    isMoving,
    isNPC,
    isPartyMember,
    isPlayer,
    isRIP,
    isWithinDistance
}) {
    const entities = []

    const isPVP = is_pvp()

    for (const id in parent.entities) {
        const entity = parent.entities[id]
        const d = distance(parent.character, entity)

        // Can attack us without moving
        if (canAttackUsWithoutMoving === true && entity.range > d) continue // The distance between us and it is greater than their attack range

        // Attacking
        if (isAttacking === true && entity.type == "monster" && !entity.target) continue // No target == not attacking anything
        if (isAttacking === false && entity.type == "monster" && entity.target) continue // Has target == attacking something
        if (isAttacking === true && entity.type == "character" && !entity.target) continue // NOTE: This isn't guaranteed to be set if a player is attacking something, because they don't need to set_target in order to attack.

        // Attacking someone in our party
        if (isAttackingParty === true && entity.type == "monster" && !parent.party_list.includes(entity.target)) continue // Not attacking a party member
        if (isAttackingParty === false && entity.type == "monster" && parent.party_list.includes(entity.target)) continue // Attacking a party member
        if (isAttackingParty === true && entity.type == "character" && !isPVP) continue // Not PVP == can't attack us
        if (isAttackingParty === true && entity.type == "character" && parent.party_list.includes(id)) continue // Can't (shouldn't?) attack us, they're in our party
        if (isAttackingParty === true && parent.character.name == "Wizard") continue // Assume Wizard won't attack us
        // TODO: See if there's a way we can tell if a player is attacking in PVP. Until then, assume they are.

        // Attacking us
        if (isAttackingUs === true && entity.type == "monster" && entity.target != parent.character.name) continue // Not targeting us
        if (isAttackingUs === false && entity.type == "monster" && entity.target == parent.character.name) continue // Is targeting us
        if (isAttackingUs === true && entity.type == "character" && !isPVP) continue // Not PVP == can't attack us
        if (isAttackingUs === true && entity.type == "character" && parent.party_list.includes(id)) continue // Can't (shouldn't?) attack us, they're in our party
        if (isAttackingUs === true && parent.character.name == "Wizard") continue // Assume Wizard won't attack us

        // TODO: See if there's a way we can tell if a player is attacking in PVP. Until then, assume they are.

        // Is of character type
        if (isCtype !== undefined && !entity.ctype) continue
        if (isCtype !== undefined && entity.ctype != isCtype) continue

        // Is Monster
        if (isMonster === true && entity.type != "monster") continue
        if (isMonster === false && entity.type == "monster") continue

        // Is Monster Type
        if (isMonsterType !== undefined && !entity.mtype) continue
        if (isMonsterType !== undefined && entity.mtype != isMonsterType) continue

        // Is Moving
        if (isMoving === true && !entity.moving) continue
        if (isMoving === false && entity.moving) continue

        // Is NPC
        if (isNPC === true && entity.type != "character") continue
        if (isNPC === true && entity.type == "character" && !entity.npc) continue

        // Is party member
        if (isPartyMember === true && !parent.party_list.includes(id)) continue
        if (isPartyMember === false && parent.party_list.includes(id)) continue

        // Is Player
        if (isPlayer === true && entity.type != "character") continue
        if (isPlayer === true && entity.npc) continue

        // Is dead
        if (isRIP === true && !entity.rip) continue
        if (isRIP === false && entity.rip) continue

        // Within Distance
        if (isWithinDistance !== undefined && d > isWithinDistance) continue // Further than said distance

        entities.push(entity)
    }
    return entities
}

function getInventory(inventory = parent.character.items) {
    const items = []
    for (let i = 0; i < 42; i++) {
        if (!inventory[i]) continue // No item in this slot
        items.push({
            ...inventory[i],
            index: i
        })
    }
    return items
}

function transferItemsToMerchant(merchantName, itemsToKeep) {
    const merchant = parent.entities[merchantName]
    if (!merchant) return // No merchant nearby
    if (distance(parent.character, merchant) > 400) return // Merchant is too far away to trade

    const itemsToKeepSet = new Set(itemsToKeep)

    for (let i = 0; i < parent.character.items.length; i++) {
        const item = parent.character.items[i]
        if (!item) continue // Empty slot
        if (itemsToKeepSet.has(item.name)) {
            // We want to keep this item, but we only need to keep one slot worth of this item, let's keep the first item found
            itemsToKeepSet.delete(item.name)
            continue
        }

        if (item.q) {
            send_item(merchantName, i, item.q)
        } else {
            send_item(merchantName, i, 1)
        }
    }
}

function transferGoldToMerchant(merchantName, minimumGold = 0) {
    if (parent.character.gold <= minimumGold) return // Not enough gold
    const merchant = parent.entities[merchantName]
    if (!merchant) return // No merchant nearby
    if (distance(parent.character, merchant) > 400) return // Merchant is too far away to trade

    send_gold(merchantName, parent.character.gold - minimumGold)
}

function mainLoop() {
    try {
        loot()
        transferItemsToMerchant(merchant, ["tracker"])
        transferGoldToMerchant(merchant, 0)

        // Join Merchant Giveaways
        for (const entity of getEntities({
                isCtype: "merchant",
                isWithinDistance: 400
            })) {
            for (const slot in entity.slots) {
                const info = entity.slots[slot]
                if (!info) continue
                if (!info.giveaway) continue
                if (info.list.includes(parent.character.id)) continue
                parent.socket.emit("join_giveaway", {
                    slot: slot,
                    id: entity.id,
                    rid: info.rid
                })
            }
        }

        // Get MH
        if (distance(parent.character, G.maps.main.ref.monsterhunter) < 400) {
            if (!parent.character.s.monsterhunt || parent.character.s.monsterhunt.c == 0) {
                // Get a new quest
                parent.socket.emit("monsterhunt")
            }
        }
    } catch (e) {

    }
    setTimeout(() => {
        mainLoop()
    }, Math.max(250, parent.character.ping))
}

async function attackLoop() {
    try {
        if (!smart.moving) {
            let attacking = getEntities({
                isMonster: true,
                isAttackingUs: true,
                isRIP: false
            })
            if (attacking.length) {
                let then = Date.now()
                await attack(attacking[0])
                reduce_cooldown("attack", (Date.now() - then) * 0.95)
            } else {
                let notAttacking = getEntities({
                    isMonster: true,
                    isRIP: false,
                    isWithinDistance: parent.character.range
                })
                if (notAttacking.length) {
                    let then = Date.now()
                    await attack(notAttacking[0])
                    reduce_cooldown("attack", (Date.now() - then) * 0.95)
                }
            }
        }
    } catch (e) {

    }
    setTimeout(() => {
        attackLoop()
    }, getCooldownMS("attack"))
}

function healLoop() {
    try {
        let hpRatio = parent.character.hp / parent.character.max_hp
        let mpRatio = parent.character.mp / parent.character.max_mp
        if (parent.character.rip) {
            respawn()
        } else if (hpRatio < mpRatio && hpRatio != 1) {
            use("use_hp")
        } else if (mpRatio != 1) {
            use("use_mp")
        }
    } catch (e) {

    }
    setTimeout(() => {
        healLoop()
    }, getCooldownMS("use_hp"))
}

function moveLoop() {
    try {
        if (!smart.moving) {
            // Get Monsterhunt
            if (!parent.character.s.monsterhunt || parent.character.s.monsterhunt.c == 0) {
                smart_move(G.maps.main.ref.monsterhunter)
                setTimeout(() => {
                    moveLoop()
                }, 10000)
                return
            }

            if (position) {
                if (distance(parent.character, position) > 1) {
                    smart_move(position)
                }
            } else {
                // #1: Check for targets within attack range
                let closeEntities = getEntities({
                    isMonsterType: target,
                    isWithinDistance: parent.character.range,
                    isRIP: false
                })
                if (closeEntities.length) {
                    stop()
                } else {
                    // #2: Check for visible targets
                    let entities = getEntities({
                        isMonsterType: target,
                        isRIP: false
                    })
                    if (entities.length) {
                        entities.sort((a, b) => {
                            return distance(parent.character, a) > distance(parent.character, b) ? 1 : -1
                        })
                        xmove(entities[0].real_x, entities[0].real_y)
                    } else {
                        // #3: Move to target spawn
                        smart_move(target)
                        setTimeout(() => {
                            moveLoop()
                        }, 10000)
                        return
                    }
                }
            }
        }
    } catch (e) {

    }
    setTimeout(() => {
        moveLoop()
    }, Math.min(250, parent.character.ping))
}

function infoLoop() {
    try {
        send_cm(merchant, {
            "message": "info",
            "info": {
                "lastSeen": new Date(),
                "shouldSwitchServer": false,
                "monsterHuntTargets": [],
                "items": getInventory(),
                "attack": parent.character.attack,
                "frequency": parent.character.frequency,
                "goldm": parent.character.goldm,
                "last_ms": parent.character.last_ms,
                "luckm": parent.character.luckm,
                "map": parent.character.map,
                "x": parent.character.real_x,
                "y": parent.character.real_y,
                "s": parent.character.s
            }
        })
    } catch (e) {

    }
    setTimeout(() => {
        infoLoop()
    }, 10000)
}

setTimeout(() => {
    mainLoop()
    attackLoop()
    healLoop()
    moveLoop()
    infoLoop()
}, 10000)