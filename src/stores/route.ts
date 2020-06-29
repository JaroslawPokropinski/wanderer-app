import { observable } from 'mobx';

export default class RouteStore {
  @observable isGenerated = false;
  @observable path: Array<[number, number]> = [];
}
