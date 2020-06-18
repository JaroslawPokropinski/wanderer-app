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
  const labeledNodes = new Map<number, Node & { visited: number }>();
  graph.nodes.forEach((v, k) => labeledNodes.set(k, { ...v, visited: 0 }));

  const dfs = (
    nodeId: number,
    length = 0,
    arr: Array<number> = [],
  ): { nodeIds: Array<number>; length: number } | null => {
    const node = labeledNodes.get(nodeId);
    if (node == null) return null;

    node.visited += 1;

    if (
      length > minLength &&
      node.neighbours.map((n) => (n.nodes[0] !== nodeId ? n.nodes[0] : n.nodes[n.nodes.length - 1])).indexOf(start) !==
        -1
    ) {
      return { nodeIds: arr, length };
    }

    if (length > maxLength) return null;

    const riter = iterate(node.neighbours);

    for (let next = riter(); next != null; next = riter()) {
      const n = next;
      const neighID = n.nodes[0] !== nodeId ? n.nodes[0] : n.nodes[n.nodes.length - 1];
      const neigh = labeledNodes.get(neighID);
      if (neigh != null && n.length != null && neigh.visited < 2) {
        const r = dfs(neighID, length + n.length, [...arr, neighID]);
        if (r != null) {
          return r;
        }
      }
    }
    return null;
  };

  return dfs(start);
};
