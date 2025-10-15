import { Schema } from 'mongoose';
import { getTransportDatabaseConnection } from '../../config/database.js';

const GoodsSchema = new Schema({
    GoodsName: String,
    Division: Number,
}, { versionKey: false });

const Goods = getTransportDatabaseConnection().model('Goods', GoodsSchema, 'TransportGoods');

// Export model methods as named exports
export const find = Goods.find.bind(Goods);
export const findOne = Goods.findOne.bind(Goods);
export const findById = Goods.findById.bind(Goods);
export const findOneAndUpdate = Goods.findOneAndUpdate.bind(Goods);
export const findByIdAndUpdate = Goods.findByIdAndUpdate.bind(Goods);
export const findByIdAndDelete = Goods.findByIdAndDelete.bind(Goods);
export const updateOne = Goods.updateOne.bind(Goods);
export const updateMany = Goods.updateMany.bind(Goods);
export const deleteOne = Goods.deleteOne.bind(Goods);
export const deleteMany = Goods.deleteMany.bind(Goods);
export const create = Goods.create.bind(Goods);
export const insertMany = Goods.insertMany.bind(Goods);
export const countDocuments = Goods.countDocuments.bind(Goods);
export const distinct = Goods.distinct.bind(Goods);
export const aggregate = Goods.aggregate.bind(Goods);
export const bulkWrite = Goods.bulkWrite.bind(Goods);

export default Goods;
