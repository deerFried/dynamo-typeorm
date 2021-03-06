import * as chai from 'chai';
const expect = chai.expect;

import {
  Table as TableDecorator,
  Attribute as AttributeDecorator,
  FullPrimaryKey as FullPrimaryKeyDecorator,
} from '../../decorator';

import * as TableOperations from '../table_operations';
import * as Query from '../index';
import { Writer } from '../writer';

import { Table } from '../../table';

import Config from '../../config';

@TableDecorator({ name: "prod-Card4" })
class Card extends Table {
  @AttributeDecorator()
  public id: number;

  @AttributeDecorator()
  public title: string;

  @FullPrimaryKeyDecorator('id', 'title')
  static readonly primaryKey: Query.FullPrimaryKey<Card, number, string>;
}

describe("Writer", () => {
  beforeEach(async () => {
    await TableOperations.createTable(Card.metadata, Config.client);
  });
  afterEach(async () => {
    await TableOperations.dropTable(Card.metadata, Config.client);
  });

  describe("put", () => {
    it("should put or update record", async () => {
      const card = new Card();
      card.id = 100;
      card.title = "100";

      const writer = new Writer(Card, Config.documentClient);
      await writer.put(card);

      const reloadedCard = await Card.primaryKey.get(100, "100");
      expect(reloadedCard).to.be.instanceof(Card);
      expect(reloadedCard!.id).to.be.eq(100);
      expect(reloadedCard!.title).to.be.eq("100");
    });
  });
});