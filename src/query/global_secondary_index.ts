import { DynamoDB } from 'aws-sdk';
import * as _ from 'lodash';

import { Table, ITable } from '../table';

import * as Metadata from '../metadata';
import * as Codec from '../codec';
import * as RangeKeyOperation from './range_key_operation';

const HASH_KEY_REF = "#hk";
const HASH_VALUE_REF = ":hkv";

const RANGE_KEY_REF = "#rk";

export class FullGlobalSecondaryIndex<T extends Table, HashKeyType, RangeKeyType> {
  constructor(
    readonly tableClass: ITable<T>,
    readonly metadata: Metadata.Indexes.FullGlobalSecondaryIndexMetadata,
    readonly documentClient: DynamoDB.DocumentClient
  ) {}

  async query(options: {
    hash: HashKeyType,
    range?: RangeKeyOperation.Operations<RangeKeyType>,
    rangeOrder?: "ASC" | "DESC",
    limit?: number,
    exclusiveStartKey?: DynamoDB.DocumentClient.Key,
  }) {
    if (!options.rangeOrder) {
      options.rangeOrder = "ASC";
    }
    const ScanIndexForward = options.rangeOrder === "ASC"

    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: this.tableClass.metadata.name,
      Limit: options.limit,
      IndexName: this.metadata.name,
      ScanIndexForward: ScanIndexForward,
      ExclusiveStartKey: options.exclusiveStartKey,
      ReturnConsumedCapacity: "TOTAL",
      KeyConditionExpression: `${HASH_KEY_REF} = ${HASH_VALUE_REF}`,
      ExpressionAttributeNames: {
        [HASH_KEY_REF]: this.metadata.hash.name,
      },
      ExpressionAttributeValues: {
        [HASH_VALUE_REF]: options.hash,
      },
    };

    if (options.range) {
      const rangeKeyOptions = RangeKeyOperation.parse(options.range, RANGE_KEY_REF);
      params.KeyConditionExpression += ` AND ${rangeKeyOptions.conditionExpression}`;
      Object.assign(params.ExpressionAttributeNames, { [RANGE_KEY_REF]: this.metadata.range.name });
      Object.assign(params.ExpressionAttributeValues, rangeKeyOptions.expressionAttributeValues);
    }

    const result = await this.documentClient.query(params).promise();

    return {
      records: (result.Items || []).map(item => {
        return Codec.deserialize(this.tableClass, item);
      }),
      count: result.Count,
      scannedCount: result.ScannedCount,
      lastEvaluatedKey: result.LastEvaluatedKey,
      consumedCapacity: result.ConsumedCapacity,
    };
  }
}

export class HashGlobalSecondaryIndex<T extends Table, HashKeyType> {
  constructor(
    readonly tableClass: ITable<T>,
    readonly metadata: Metadata.Indexes.HashGlobalSecondaryIndexMetadata,
    readonly documentClient: DynamoDB.DocumentClient
  ) {}

  async query(hash: HashKeyType, options: { limit?: number } = {}) {
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: this.tableClass.metadata.name,
      IndexName: this.metadata.name,
      Limit: options.limit,
      ReturnConsumedCapacity: "TOTAL",
      KeyConditionExpression: `${HASH_KEY_REF} = ${HASH_VALUE_REF}`,
      ExpressionAttributeNames: {
        [HASH_KEY_REF]: this.metadata.hash.name,
      },
      ExpressionAttributeValues: {
        [HASH_VALUE_REF]: hash,
      },
    };

    const result = await this.documentClient.query(params).promise();

    return {
      records: (result.Items || []).map(item => {
        return Codec.deserialize(this.tableClass, item);
      }),
      count: result.Count,
      scannedCount: result.ScannedCount,
      lastEvaluatedKey: result.LastEvaluatedKey,
      consumedCapacity: result.ConsumedCapacity,
    };
  }
}
