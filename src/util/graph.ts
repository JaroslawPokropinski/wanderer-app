import { iterate } from './arrayUtil';
import { delay } from './generic';
// import { Heap } from 'qheap';

export class Node {
  constructor(public arrayIndex: number, public id: number, public lat: number, public lon: number) {}

  public edges = new Array<Edge>();
  public neighbours = new Array<Node>();

  public addEdge(edge: Edge) {
    this.edges.push(edge);
    this.neighbours.push(edge.nodes[0] === this ? edge.nodes[edge.nodes.length - 1] : edge.nodes[0]);
  }
}

export class Edge {
  constructor(public arrayIndex: number, public nodes: Array<Node>, public length: number) {}
}

export class Graph {
  public nodes: Array<Node> = [];
  public readonly edges: Array<Edge> = [];

  addEdge(nodes: Array<Node>, length: number) {
    const e = new Edge(this.edges.length, nodes, length);
    this.edges.push(e);
    return e;
  }

  addNode(id: number, lat: number, lon: number): Node {
    const n = new Node(this.nodes.length, id, lat, lon);
    this.nodes.push(n);
    return n;
  }
}

export const getClosestNode = (graph: Graph, lat: number, lon: number) => {
  let minLen = Number.MAX_SAFE_INTEGER;
  let node = graph.nodes[0];

  graph.nodes
    .filter((n) => n.neighbours.length > 0)
    .forEach((n) => {
      const len = Math.pow(n.lat - lat, 2) + Math.pow(n.lon - lon, 2);
      if (len < minLen) {
        minLen = len;
        node = n;
      }
    });
  return node;
};

const getBoxCenter = (nodes: Node[]): { lat: number; lon: number } => {
  const latSum = nodes.reduce((p, c) => p + c.lat, 0);
  const lonSum = nodes.reduce((p, c) => p + c.lon, 0);

  return { lat: latSum / nodes.length, lon: lonSum / nodes.length };
};

export const findCycle = async (start: Node, graph: Graph, _minLength = 0, maxLength = 10) => {
  const nodeLabels: Array<number> = graph.nodes.map(() => 0);
  const arr: Array<Node> = [];

  let length = 0;
  let node = start;

  while (length < maxLength / 2) {
    if (node == null) return null;
    nodeLabels[node.arrayIndex] += 1;
    // Filter edges to try to go north
    const tnode = node;
    const northEdges = node.edges
      .map((e, i) => ({ e, n: tnode.neighbours[i] }))
      .filter((p) => {
        return nodeLabels[p.n.arrayIndex] === 0 && p.n.lat - tnode.lat > 0 && p.n.lon - tnode.lon;
      });
    const edges = northEdges.length > 0 ? northEdges : node.edges.map((e, i) => ({ e, n: tnode.neighbours[i] }));
    const riter = iterate(edges);
    const edge = riter();
    if (edge == null) return null;

    const edgeNodes = edge.e.nodes[0] === node ? edge.e.nodes : edge.e.nodes.reverse();

    length += edge.e.length;
    edgeNodes.forEach((n) => arr.push(n));
    node = edge.n;
    await delay();
  }
  // const wayBack = { path: new Array<Node>(), length: 0 };
  const wayBack = (await A_star(arr[arr.length - 1], start, graph)) ?? { path: new Array<Node>(), length: 0 };
  const nodes = [...arr, ...wayBack.path];
  return { nodes, length: length + wayBack.length, center: getBoxCenter(nodes) };
};

export function measure(lat1: number, lon1: number, lat2: number, lon2: number) {
  // generally used geo measurement function
  const R = 6378.137; // Radius of earth in KM
  const dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
  const dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d; // kilometers
}

const A_star = async (start: Node, end: Node, graph: Graph) => {
  const h = (node: Node) => measure(node.lat, node.lon, start.lat, start.lon);
  const openSet = new Set<Node>();
  openSet.add(start);
  const cameFrom = new Map<Node, Edge>();
  const gScore = new Map<Node, number>();
  gScore.set(start, 0);
  type ScoredNode = {
    node: Node;
    fScore: number;
  };
  // const fScore = new Heap<ScoredNode>({ comparBefore: (a, b) => a.fScore > b.fScore });
  const fScore = new Map<Node, number>();
  fScore.set(start, h(start));
  // fScore.insert({ node: start, fScore: h(start) });

  const getCurrent = () => {
    let best: Node = openSet.values().next().value;
    let bestScore = Infinity;
    openSet.forEach((node) => {
      const score = fScore.get(node) ?? Infinity;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    });
    return best;
  };

  const reconstructPath = (last: Node) => {
    const path = [last];
    let current: Node | null = last;
    while (current != null && cameFrom.has(current)) {
      const edge = cameFrom.get(current) ?? null;
      if (edge != null) {
        const edgeNodes: Node[] = edge.nodes[0] === current ? edge.nodes.reverse() : edge.nodes;
        current = edgeNodes[0];
        path.unshift(...edgeNodes);
      }
    }
    return path;
  };

  while (openSet.size > 0) {
    const currentNode = getCurrent();

    openSet.delete(currentNode);
    if (currentNode === end) {
      const path = reconstructPath(currentNode);
      let length = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const node1 = graph.nodes[path[i].arrayIndex];
        const node2 = graph.nodes[path[i + 1].arrayIndex];

        length += measure(node1.lat, node1.lon, node2.lat, node2.lon);
        await delay();
      }
      return { path, length };
    }

    for (let i = 0; i < currentNode.edges.length; i++) {
      const edge: Edge = currentNode.edges[i];
      const neighbor = currentNode.neighbours[i];
      const tentative_gScore = (gScore.get(currentNode) ?? Infinity) + edge.length;
      const neighborScore = gScore.get(neighbor) ?? Infinity;
      if (tentative_gScore < neighborScore) {
        cameFrom.set(neighbor, currentNode.edges[i]);
        gScore.set(neighbor, tentative_gScore);
        fScore.set(neighbor, tentative_gScore + h(neighbor));
        if (!openSet.has(neighbor)) {
          openSet.add(neighbor);
        }
      }
      await delay();
    }
  }
  return { path: [], length: Infinity };
};
