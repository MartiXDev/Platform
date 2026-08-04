export function findDependencyCycle(nodes, getDependencies) {
  const states = new Map(nodes.map((node) => [node, "unvisited"]));
  const path = [];

  function visit(node) {
    const state = states.get(node);
    if (state === "visiting") {
      const cycleStart = path.indexOf(node);
      return [...path.slice(cycleStart), node];
    }
    if (state === "visited") {
      return null;
    }

    states.set(node, "visiting");
    path.push(node);
    for (const dependency of getDependencies(node)) {
      const cycle = visit(dependency);
      if (cycle !== null) {
        return cycle;
      }
    }
    path.pop();
    states.set(node, "visited");
    return null;
  }

  for (const node of nodes) {
    const cycle = visit(node);
    if (cycle !== null) {
      return cycle;
    }
  }

  return null;
}
