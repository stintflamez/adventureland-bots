import('http://localhost:3000/merchant.js')
    .then((module) => {
        bots.merchant.run()
    });

function on_party_invite(name) {
    if (name != "earthiverse") return;
    accept_party_invite(name);
}