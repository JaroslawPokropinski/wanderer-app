import { observable, action } from 'mobx';

export default class GenericsStore {
  @observable proposalEvent?: Event;

  @action
  setProposalEvent(e: Event) {
    this.proposalEvent = e;
  }
}
