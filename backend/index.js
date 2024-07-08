
require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const Transaction = require('./models/Transaction');

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

app.use(express.json());
app.use(cors());


app.get('/api/init', async (req, res) => {
  try {
    const { dateOfSale, title, price } = req.query;

    if (dateOfSale) {
      let month;
      const isMonthOnlyFormat = /^\d{2}$/.test(dateOfSale);

      if (isMonthOnlyFormat) {
        month = parseInt(dateOfSale, 10);

        const query = {
          $expr: { $eq: [{ $month: "$dateOfSale" }, month] }
        };

        if (title) {
          query.title = new RegExp(title, 'i');
        }

        if (price) {
          query.price = new RegExp(price, 'i');
        }

        const transactions = await Transaction.find(query);
        res.status(200).json(transactions);
      } else {
        return res.status(400).send("Invalid dateOfSale format. Use 'MM'.");
      }
    } else {
      const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
      const transactions = response.data.map(transaction => ({
        ...transaction,
        category: transaction.category || '',  // Ensure category is a string
        sold: transaction.sold || false,      // Ensure sold is a boolean
        image: transaction.image || ''        // Ensure image is a string
      }));

      await Transaction.deleteMany();
      await Transaction.insertMany(transactions);

      res.status(200).json(transactions);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send("Error processing request");
  }
});

// API for listing transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
  try {
    const { month, search, page = 1, perPage = 10 } = req.query;
    const monthInt = parseInt(month, 10);

    const matchQuery = {
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] }
    };

    if (search) {
      matchQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { price: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(matchQuery)
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).send("Error fetching transactions");
  }
});

// Statistics API
app.get('/api/statistics', async (req, res) => {
  try {
    const { month } = req.query;
    const monthInt = parseInt(month, 10);

    if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).send("Invalid month format. Use 'MM'.");
    }

    const transactions = await Transaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] } } },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: "$price" },
          totalSoldItems: { $sum: { $cond: [{ $eq: ["$isSold", true] }, 1, 0] } },
          totalNotSoldItems: { $sum: { $cond: [{ $eq: ["$isSold", false] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json(transactions[0] || {});
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send("Error processing request");
  }
});

// API for Bar Chart
app.get('/api/bar-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthInt = parseInt(month, 10);

    const priceRanges = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-200', min: 101, max: 200 },
      { range: '201-300', min: 201, max: 300 },
      { range: '301-400', min: 301, max: 400 },
      { range: '401-500', min: 401, max: 500 },
      { range: '501-600', min: 501, max: 600 },
      { range: '601-700', min: 601, max: 700 },
      { range: '701-800', min: 701, max: 800 },
      { range: '801-900', min: 801, max: 900 },
      { range: '901-above', min: 901, max: Infinity }
    ];

    const transactions = await Transaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthInt] }
        }
      },
      {
        $bucket: {
          groupBy: "$price",
          boundaries: priceRanges.map(range => range.min),
          default: "901-above",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const barChartData = priceRanges.map(range => {
      const data = transactions.find(trx => trx._id === range.range) || { count: 0 };
      return { range: range.range, count: data.count };
    });

    res.status(200).json(barChartData);
  } catch (error) {
    console.error('Error fetching bar chart data:', error);
    res.status(500).send("Error fetching bar chart data");
  }
});

app.get('/api/combined-data', async (req, res) => {
  try {
    const { month } = req.query;

    const statisticsResponse = await axios.get(`http://localhost:${PORT}/api/statistics`, { params: { month } });
    const barChartResponse = await axios.get(`http://localhost:${PORT}/api/bar-chart`, { params: { month } });

    const combinedData = {
      statistics: statisticsResponse.data,
      barChart: barChartResponse.data,
    };

    res.status(200).json(combinedData);
  } catch (error) {
    console.error('Error fetching combined data:', error);
    res.status(500).send("Error fetching combined data");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
