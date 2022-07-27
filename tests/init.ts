/**
 * @file 初始化链接示例
 */

import { connect } from '..';

// Case1
const database = connect({
    name: 'oker',
    tables: {
        test: { primary: '_id', unique: ['label'] }
    }
});

export const table = database.getCollection('test');
