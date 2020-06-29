import Axios from 'axios';
import { iterate } from './arrayUtil';

export const getGeolocation = (): Promise<Position> => {
  return new Promise<Position>((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('Your browser does not support geolocation'));

    const onSuccess: PositionCallback = (position) => {
      resolve(position);
    };
    const onError: PositionErrorCallback = (positionError) => {
      reject(positionError);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError);
  });
};

export const getStartingNodes = (lat: number, lng: number): Promise<unknown> => {
  return Axios.get(
    `https://www.openstreetmap.org/api/0.6/map?bbox=${lng - 0.1},${lat - 0.1},${lng + 0.1},${lat + 0.1}`,
  );
};

// type RoutingData = { coordinates: Array<[number, number]>; properties: { distance: string } };

// export const getPath = (flat: number, flng: number, tlat: number, tlng: number): Promise<RoutingData> => {
//   return Axios.get<RoutingData>(
//     `https://wandering-application.herokuapp.com/api/1.0/gosmore.php?format=geojson&flat=${flat}&flon=${flng}&tlat=${tlat}&tlon=${tlng}&fast=0&layer=mapnik`, // &v=foot
//   ).then((res) => res.data);
// };

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

type Node = {
  type: 'node';
  id?: number;
  lat?: number;
  lon?: number;
  neighbours: Array<Edge>;
};

type MapWay = {
  type: 'way';
  id?: number;
  nodes?: Array<number>;
};

type MapElement =
  | Node
  | MapWay
  | {
    type: 'relation';
  };

type MapData = {
  elements: Array<MapElement>;
};

type Edge = {
  length: number;
  nodes: Array<number>;
};

const addEdge = (nodes: Map<number, Node>, edge: Edge) => {
  const start = edge.nodes[0];
  const finish = edge.nodes[edge.nodes.length - 1];

  const n1 = nodes.get(start);
  if (n1 != null) {
    n1.neighbours.push(edge);
  }

  const n2 = nodes.get(finish);
  if (n2 != null) {
    n2.neighbours.push(edge);
  }
};

const dist = (n1: Node, n2: Node) => {
  if (n1.lat == null || n1.lon == null || n2.lat == null || n2.lon == null) return 0;

  return measure(n1.lat, n1.lon, n2.lat, n2.lon);
};

const splitEdge = (way: MapWay, nodes: Map<number, Node>, linkMap: Map<number, number>, start = 0): Array<Edge> => {
  if (way.nodes == null) return [];
  let lengthSum = 0;
  let prevNode: Node | null = nodes.get(way.nodes[start]) ?? null;

  for (let i = start + 1; i < way.nodes.length - 1; i++) {
    const linkCount = linkMap.get(way.nodes[i]);
    const currNode: Node | null = nodes.get(way.nodes[i]) ?? null;
    if (prevNode != null && currNode != null) {
      lengthSum += dist(prevNode, currNode);
    }
    prevNode = currNode;

    if (linkCount != null && linkCount > 1) {
      const edge = { nodes: way.nodes.slice(start, i + 1), length: lengthSum };
      addEdge(nodes, edge);
      return [edge, ...splitEdge(way, nodes, linkMap, i)];
    }
  }
  const edge = { nodes: way.nodes.slice(start), length: lengthSum };
  addEdge(nodes, edge);
  return [edge];
};

export const createGraph = (lat: number, lon: number): Promise<{ nodes: Map<number, Node>; edges: Array<Edge> }> => {
  const radius = 0.005;
  return Axios.get<MapData>(
    `https://www.openstreetmap.org/api/0.6/map?bbox=${lon - radius},${lat - radius},${lon + radius},${lat + radius}`,
  ).then((res) => {
    const elements = res.data.elements;
    const nodeLinkMap = new Map<number, number>();
    const nodes = new Map<number, Node>();
    elements.forEach((v) => {
      if (v.type === 'way' && v.nodes != null) {
        v.nodes.forEach((node) => {
          const linkCounterOpt = nodeLinkMap.get(node);
          nodeLinkMap.set(node, linkCounterOpt != null ? linkCounterOpt + 1 : 1);
        });
      } else if (v.type === 'node' && v.id != null) {
        v.neighbours = [];
        nodes.set(v.id, v);
      }
    });

    const edges: Array<Edge> = [];
    elements.forEach((v) => {
      if (v.type === 'way' && v.nodes != null) {
        splitEdge(v, nodes, nodeLinkMap).forEach((e) => edges.push(e));
      }
    });
    return { nodes, edges };
  });
};

// TODO: Improve finding routes
export const findCycle = (
  start: number,
  graph: { nodes: Map<number, Node>; edges: Array<Edge> },
  minLength = 0,
  maxLength = 10,
) => {

  return getRandomPath(start, graph, maxLength)
};

const A_star = (start: number, end: number, graph: { nodes: Map<number, Node>; edges: Array<Edge> }) => {
  const startNode_: Node | undefined = graph.nodes.get(start)
  if (startNode_ == undefined) {
    throw new Error()
  }
  const startNode = startNode_
  const h = (node: number) => dist(graph.nodes.get(node) ?? startNode, startNode)
  const openSet = new Set<number>()
  openSet.add(start)
  const cameFrom = new Map<number, number>()
  const gScore = new Map<number, number>()
  gScore.set(start, 0)
  const fScore = new Map<number, number>()
  fScore.set(start, h(start))

  const getCurrent = () => {
    let best: number = openSet.values().next().value
    let bestScore = Infinity
    openSet.forEach((node) => {
      if (fScore.get(node) ?? Infinity < bestScore) {
        bestScore = fScore.get(node) ?? Infinity
        best = node
      }
    })
    return best
  }

  const reconstructPath = (last: number) => {
    const path = [last]
    let current = last
    while (cameFrom.has(current)) {
      current = cameFrom.get(current) ?? 0
      path.unshift(current)
    }
    return path
  }

  while (openSet.size > 0) {
    const current: number = getCurrent()
    const currentNode = graph.nodes.get(current)
    openSet.delete(current)
    if (current === end) {
      const path = reconstructPath(current)
      let length: number = 0
      for (let i = 0; i < path.length - 1; i++) {
        const node1 = graph.nodes.get(path[i])
        const node2 = graph.nodes.get(path[i + 1])
        if (node1 === undefined || node2 === undefined) {
          throw new Error()
        }
        length += dist(node1, node2)
      }
      return { path: path, length: length }
    }

    for (let edge of graph.nodes.get(current)?.neighbours ?? []) {
      const neighbor = edge.nodes[0] !== current ? edge.nodes[0] : edge.nodes[edge.nodes.length - 1]
      if (neighbor === undefined) {
        throw new Error()
      }
      const tentative_gScore = gScore.get(current) ?? Infinity + edge.length
      const neighborScore = gScore.get(neighbor) ?? Infinity
      if (tentative_gScore < neighborScore) {
        cameFrom.set(neighbor, current)
        gScore.set(neighbor, tentative_gScore)
        fScore.set(neighbor, tentative_gScore + h(neighbor))
        if (!openSet.has(neighbor)) {
          openSet.add(neighbor)
        }
      }
    }

  }
  return { path: [], length: Infinity }
}

const getRandomPath = (
  start: number,
  graph: { nodes: Map<number, Node>; edges: Array<Edge> },
  length = 10,
) => {

  // const g1 = {nodes: new Map<number, Node>(), edges: Array<Edge>() }
  // g1.edges.push({length:1, nodes:[0,1]}) //0
  // g1.edges.push({length:1, nodes:[0,2]})//1
  // g1.edges.push({length:1, nodes:[2,1]})//2
  // g1.edges.push({length:1, nodes:[2, 3]})//3
  // g1.edges.push({length:1, nodes:[3,4]})//4
  // g1.edges.push({length:1, nodes:[4,5]})//5
  // g1.edges.push({length:1, nodes:[6,5]})//6
  // g1.edges.push({length:1, nodes:[3, 7]})//7
  // g1.edges.push({length:1, nodes:[8, 9]})//8
  // g1.edges.push({length:1, nodes:[8, 7]})//9
  // g1.edges.push({length:1, nodes:[9, 7]})//9

  // g1.nodes.set(0, {lat: 432, lon: 249, type: 'node', neighbours: [g1.edges[0], g1.edges[1]]})
  // g1.nodes.set(1, {lat: 546, lon: 71, type: 'node', neighbours: [g1.edges[0], g1.edges[2]]})
  // g1.nodes.set(2, {lat: 645, lon: 250, type: 'node', neighbours: [g1.edges[1], g1.edges[2], g1.edges[3]]})
  // g1.nodes.set(3, {lat: 885, lon: 305, type: 'node', neighbours: [g1.edges[3], g1.edges[4]]})
  // g1.nodes.set(4, {lat: 983, lon: 655, type: 'node', neighbours: [g1.edges[5], g1.edges[4]]})
  // g1.nodes.set(5, {lat: 583, lon: 516, type: 'node', neighbours: [g1.edges[5], g1.edges[6]]})

  // g1.nodes.set(6, {lat: 429, lon: 756, type: 'node', neighbours: [g1.edges[6]]})
  // g1.nodes.set(7, {lat: 1301, lon: 442, type: 'node', neighbours: [g1.edges[7], g1.edges[9]]})
  // g1.nodes.set(8, {lat: 1557, lon: 304, type: 'node', neighbours: [g1.edges[8], g1.edges[9]]})
  // g1.nodes.set(9, {lat: 1449, lon: 676, type: 'node', neighbours: [g1.edges[8], g1.edges[10]]})

  // const {path:p, length:l} = A_star(8, 6, g1)
  // console.log([p, l])

  // console.log(graph.edges[0].length)
  // console.log(dist(graph.nodes.get(graph.edges[0].nodes[0]), graph.nodes.get(graph.edges[0].nodes[graph.edges[0].nodes.length-1])))

  let currentLength = 0
  const path = [start]
  let current = start
  const startNode = graph.nodes.get(start)
  if(startNode===undefined){
    throw new Error()
  }
  const getProba = (dist: number) => {
    if ((currentLength + dist) >= length) {
      return 1
    }
    return 1 - Math.exp(-2 * (currentLength + dist) / length)
  }
  while (true) {
    
    let newNode = null
    // const proba = getProba(l)
    const proba = 0
    const d = graph.nodes.get(current) ?? startNode
    if (currentLength + dist(d, startNode) >= length) {
      break
    }
    if (Math.random() < proba) {
      const { path: p, length: l } = A_star(current, start, graph)
      newNode = p[1]
    } else {
      const neighbours = graph.nodes.get(current)?.neighbours
      if (neighbours === undefined) {
        throw new Error()
      }
      const numberOfNeighbours = neighbours?.length ?? 0
      const n = Math.floor(Math.random() * numberOfNeighbours)
      newNode = neighbours[n].nodes[0] !== current ? neighbours[n].nodes[0] : neighbours[n].nodes[neighbours[n].nodes.length - 1]
    }
    // console.log(currentLength)
    // console.log(newNode)
    // console.log(proba)

    path.push(newNode)
    const node1 = graph.nodes.get(newNode)
    const node2 = graph.nodes.get(path[path.length - 2])
    if (node1 === undefined || node2 === undefined) {
      throw new Error()
    }
    currentLength += dist(node1, node2) + 0.001
    if (newNode === start && currentLength >= length) {
      break
    }
    current = newNode
  }
  const last = path[path.length-1]
  if(last!==start) {
    const { path: p, length: l } = A_star(last, start, graph)
    path.push(...p)
  }

  return { nodeIds: path, length: currentLength }
};