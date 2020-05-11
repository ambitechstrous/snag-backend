import express from 'express';
import { initMongoConnection, getProducts, getSearchSuggestions } from './mongo_functions';

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/products', getProducts);
app.get('/api/searchSuggestions', getSearchSuggestions);

initMongoConnection();
app.listen(port, () => console.log("Running on port " + port));