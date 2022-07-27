/**
 * @file 查询示例
 */

import { table } from './init';

export default function () {
    // Case4
    table.findById(2).then(res => {
        console.log('Case4', res);
    });

    // Case5
    table.find({
        _id: { $gte: 5, $lte: 9 },
        'test.haha': 1
    }).then(res => {
        console.log('Case5', res);
    });

    // Case6
    table.find({
        _id: { $gte: 5, $lte: 9 },
        'test.0.haha': 2
    }).then(res => {
        console.log('Case6', res);
    });

    // Case7
    table.find({
        _id: { $gte: 5, $lte: 9 },
        'test.haha': {
            $in: [1, 2]
        }
    }).then(res => {
        console.log('Case7', res);
    });

    // Case8
    table.find({
        _id: { $gte: 5, $lte: 9 },
        'test.haha': {
            $nin: [1]
        }
    }).then(res => {
        console.log('Case8', res);
    });

    // Case9
    table.find({
        test: {
            $eq: { haha: 2 }
        }
    }).then(res => {
        console.log('Case9', res);
    });

    // Case10
    table.find({
        _id: 6,
        test: {
            $ne: { haha: 1 }
        }
    }).then(res => {
        console.log('Case10', res);
    });

    // Case11
    table.findOne({
        _id: 6,
        test: {
            $ne: { haha: 1 }
        }
    }).then(res => {
        console.log('Case11', res);
    });

    // Case12
    table.findOne({
        _id: { $nin: [2, 4, 5, 9] }
    }).then(res => {
        console.log('Case12', res);
    });

    // Case15
    table.find({
        _id: {
            $or: [
                { $gte: 9 },
                { $lte: 4 },
            ]
        },
        name: {
            $in: [456]
        }
    }).then(res => {
        console.log('Case15', res);
    });
}
