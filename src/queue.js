const chains = new Map();

function runInSessionQueue(sessionKey, task) {
  const key = sessionKey || "global";
  const previous = chains.get(key) || Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (chains.get(key) === next) {
        chains.delete(key);
      }
    });
  chains.set(key, next);
  return next;
}

module.exports = {
  runInSessionQueue,
};
