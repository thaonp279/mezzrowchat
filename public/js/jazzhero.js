var messages = {
  ladyday: "Don't threaten me with love, baby. Let's just go walking in the rain. 🌧",
  prez: "I'm looking for something soft. It's got to be sweetness, man, you dig? 🤗",
  cannonball: "You don't decide you're hip. It just happens that way. 😎",
  chet: "I'm definitely a romantic. 😍",
  rabbit: "🐰🥕🥕🥕🥕"
};

function chatDemo(event, first, last) {
  let hero = event.target.id;
  let message = messages[hero];
  let nickname = createAlias(hero, first, last);
  document.getElementById('name').textContent = nickname;
  document.getElementById('message').textContent = message;

}

function createAlias(hero, first, last) {
  switch(hero) {
    case 'ladyday':
      return 'lady '+ (last? last: first);
      break;
    case 'prez':
      return first+' for prez 2030';
      break;
    case 'cannonball':
      return 'a cannonball of '+first;
      break;
    case 'chet':
      return 'prince of coo_'+first+'_ool';
      break;
    case 'rabbit':
      return 'bunny '+ first;
      break;
  }
}

module.exports = {
  chatDemo,
  createAlias
}