/**
 * @file 删除记录示例
 */

import { table } from './init';

export default function () {

    // Case13
    table.deleteOne({
        _id: 4
    }).then(res => {
        console.log('Case13: deleteOne', res);
    });

    // Case14
    table.deleteOne({
        _id: { $nin: [2, 4, 5, 9] }
    }).then(res => {
        console.log('Case14: deleteOne', res);
    });

    // Case16
    table.deleteMany({
        _id: { $nin: [2, 4, 5, 9] }
    }).then(res => {
        console.log('Case16: deleteOne', res);
    });
}
