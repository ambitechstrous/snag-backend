import express from 'express';
import mongoose, { Schema } from 'mongoose';
import util from 'util';

const snagSchema = new Schema({}, {strict: false});
const productsProjection = {
	storeName: 1, 
	storeAddress: 1, 
	lat: 1, 
	lng: 1, 
	hours: 1, 
	productName: 1
};

/*	Could be null but this is okay
	We want to keep uptime in case non-mongo services want to run.
	All future enpoints should, however, make sure to catch any
	potential null/undefined exceptions */
let db;

export async function initMongoConnection() {
	mongoose.createConnection(
		process.env.MONGODB_URI, {useNewUrlParser: true})
	.then(conn => {
		db = conn;
		console.log("Mongo connection initalized");
	})
	.catch(err => console.log(err));
}

export async function getProducts(req, resp) {
	const longitude = parseFloat(req.query.lng);
	const latitude = parseFloat(req.query.lat);
	const distance = parseFloat(req.query.distance);
	const searchString = req.query.search;
	const regex = util.format('.*%s.*', searchString);

	const findOp = {
		keywords: {
			$regex: regex, 
			$options: "i"
		}
	};
	
	const geoOp = {
		near: {
			type: "Point", 
			coordinates: [longitude, latitude]
		}, 
		key: "location", 
		distanceField: "distance", 
		maxDistance: distance, 
		query: findOp, 
		spherical: true
	};

	try {
		const snagModel = db.model('Snag', snagSchema, 'Snag');
		const aggregate = snagModel.aggregate([
			{$geoNear: geoOp},
			{$project: productsProjection}
		]);

		const result = await aggregate.exec();
		resp.send({data: result});
	} catch(err) {
		console.log(err.stack);
		resp.status(500).send("Unexpected error occurred");
	}
}

// TODO: Use Regex to limit the scope. We can't have the app trying to store a million rows locally
export async function getSearchSuggestions(req, resp) {
	try {
		const snagModel = db.model('Snag', snagSchema, 'Snag');
		const suggestions = await snagModel.aggregate([
			{$project: {keywords: 1, _id: 0}},
			{$unwind: "$keywords"},
			{$group: {_id: "suggestions", suggestions: {$addToSet: "$keywords"}}}
		]);

		const result = suggestions && suggestions.length 
			? suggestions[0] : {suggestions: []};
		resp.send(result);
	} catch(err) {
		console.log(err.stack);
		resp.status(500).send("Unexpected error occurred");
	}
}