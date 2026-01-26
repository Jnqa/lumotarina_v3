function calculateCharacter(questions, answers) {
  const result = {
    answers: [],
    abilities: {},
    tags: [],
    classes: [],
    lucoins: 0
  };

  questions.forEach(q => {
    const answerId = answers[q.id];
    if (!answerId) return;

    const option = q.options.find(o => o.id === answerId);
    if (!option) return;

    result.answers.push({
      questionId: q.id,
      optionId: option.id,
      text: option.text
    });

    applyEffects(result, option.effects || {});
  });

  return result;
}

function applyEffects(result, effects) {
  if (effects.lucoins) result.lucoins += effects.lucoins;

  if (effects.tags) {
    effects.tags.forEach(tag => {
      if (!result.tags.includes(tag)) result.tags.push(tag);
    });
  }

  if (effects.abilities) {
    Object.entries(effects.abilities).forEach(([key, value]) => {
      result.abilities[key] = (result.abilities[key] || 0) + value;
    });
  }

  if (effects.classes) {
    effects.classes.forEach(cls => {
      if (!result.classes.includes(cls)) result.classes.push(cls);
    });
  }
}

module.exports = { calculateCharacter };
