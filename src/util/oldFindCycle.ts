import { Graph, Node, Edge } from './graph';
import { delay } from './generic';
import { iterate } from './arrayUtil';

const startPhero = 1;
const evapPerIter = 0.4;
const antIter = 300;
const antsSize = 30;

export const findCycleAnts = async (
  start: Node,
  graph: Graph,
  minLength = 0,
  maxLength = 10,
): Promise<{ nodes: Array<Node>; length: number }> => {
  const pheromones = new Array<number>(graph.edges.length);
  graph.edges.forEach((_, index) => (pheromones[index] = startPhero));

  for (let iter = 0; iter < antIter; iter++) {
    for (let ant = 0; ant < antsSize; ant++) {
      await delay();
      // Do random walk (random dfs)
      const way = randomWalk(start, graph, minLength, maxLength, pheromones);
      // Update pheromone by f(length) (here?)
      const f = way != null ? fitness(way) : 0;
      console.log(f);
      way?.edges.forEach((e) => (pheromones[e.arrayIndex] += f));
    }
    // Evaporate phero
    graph.edges.forEach((_, index) => (pheromones[index] -= evapPerIter));
  }
  const rway = randomWalk(start, graph, minLength, maxLength, pheromones);
  const f = rway != null ? fitness(rway) : 0;
  console.log(f);

  let prev = start;
  return {
    nodes:
      rway?.edges
        .map((e: Edge) => {
          const r = e.nodes[0] === prev ? e.nodes : e.nodes.reverse();
          prev = e.nodes[0] === prev ? e.nodes[e.nodes.length - 1] : e.nodes[0];
          return r;
        })
        .reduce((p, c) => [...p, ...c]) ?? new Array<Node>(),
    length: rway?.length ?? 0,
  };
};

const fitness = (way: { edges: Array<Edge>; length: number }) => {
  const lengthFit = 1 / way.length;

  const nodes = way.edges.reduce((p, c) => [...p, c.nodes[0], c.nodes[c.nodes.length - 1]], new Array<Node>());
  const center = centerVec(nodes);
  const centerFit =
    1 /
    (nodes
      .map((n) => {
        const a = n.lat - center.lat;
        const b = n.lon - center.lon;
        const d = Math.sqrt(a * a + b * b);
        return Math.abs(d - way.length / (2 * Math.PI));
      })
      .reduce((p, c) => p + c) /
      nodes.length);

  return lengthFit + centerFit * 2;
};

const centerVec = (nodes: Node[]): { lat: number; lon: number } => {
  const latSum = nodes.reduce((p, c) => p + c.lat, 0);
  const lonSum = nodes.reduce((p, c) => p + c.lon, 0);

  return { lat: latSum / nodes.length, lon: lonSum / nodes.length };
};

const antIterate = (nodes: Node[], edges: Edge[], ph: number[]) => {
  const list = nodes.map((n, i) => ({ n, e: edges[i], ph: ph[edges[i].arrayIndex] }));
  return (): [Node, Edge] | null => {
    if (list.length <= 0) return null;

    const sumPh = list.reduce((p, c) => p + c.ph, 0);
    let r = Math.random();
    let i = 0;

    for (; r > 0 && i < list.length; i++) {
      r = r - list[i].ph / sumPh;
    }
    i--;

    const el = list[i];
    list[i] = list[list.length - 1];
    list.pop();

    return [el.n, el.e];
  };
};

const randomWalk = (start: Node, g: Graph, minLength: number, maxLength: number, ph: Array<number>) => {
  const nodeLabels: Array<number> = g.nodes.map(() => 0);

  const dfs = (node: Node, length = 0, arr: Array<Edge> = []): { edges: Array<Edge>; length: number } | null => {
    nodeLabels[node.arrayIndex] += 1;

    if (length >= minLength && node.neighbours.indexOf(start) !== -1) {
      const edge = node.edges[node.neighbours.map((n) => n.id).indexOf(start.id)];
      return { edges: [...arr, edge], length };
    }

    if (length > maxLength) return null;

    const riter = antIterate(node.neighbours, node.edges, ph);

    for (let next = riter(); next != null; next = riter()) {
      const edge = next[1];
      const neigh = next[0];

      if (nodeLabels[neigh.arrayIndex] < 2) {
        const r = dfs(neigh, length + edge.length, [...arr, edge]);
        if (r != null) {
          return r;
        }
      }
    }
    return null;
  };

  return dfs(start);
};

export const findCycleDfs = (start: Node, graph: Graph, minLength = 0, maxLength = 10) => {
  const nodeLabels: Array<number> = graph.nodes.map(() => 0);

  const dfs = (node: Node, length = 0, arr: Array<Node> = []): { nodes: Array<Node>; length: number } | null => {
    if (node == null) return null;

    nodeLabels[node.arrayIndex] += 1;

    if (length > minLength && node.neighbours.indexOf(start) !== -1) {
      return { nodes: arr, length };
    }

    if (length > maxLength) return null;

    const riter = iterate(node.edges);

    for (let next = riter(); next != null; next = riter()) {
      const n = next;
      const neigh = n.nodes[0] !== node ? n.nodes[0] : n.nodes[n.nodes.length - 1];

      if (neigh != null && n.length != null && nodeLabels[neigh.arrayIndex] < 2) {
        const edgeNodes = n.nodes[0] === node ? n.nodes : n.nodes.reverse();
        const r = dfs(neigh, length + n.length, [...arr, ...edgeNodes]);
        if (r != null) {
          return r;
        }
      }
    }
    return null;
  };

  return dfs(start);
};

export const findCycle = findCycleAnts;
