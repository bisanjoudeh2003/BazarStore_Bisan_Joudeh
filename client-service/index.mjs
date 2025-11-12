import { Command } from 'commander';
import inquirer from 'inquirer';
import axios from "axios";

const program = new Command();
program
  .name('DOS CLI')
  .description('Command Line Interface for DOS Project (Catalog + Order)')
  .version('1.0.0');

const questionSearch = [
  {
    type: 'input',
    name: 'topic',
    message: ' Please enter book topic to search for: ',
  },
];

const questionInfo = [
  {
    type: 'number',
    name: 'bookId',
    message: ' Please enter book ID to get details: ',
  },
];

const questionPurchase = [
  {
    type: 'number',
    name: 'bookId',
    message: ' Please enter book ID to purchase: ',
  },
  {
    type: 'number',
    name: 'quantity',
    message: ' Please enter quantity to purchase: ',
  },
];


program
  .command('search')
  .alias('s')
  .description('Search for books by topic (from Catalog Service)')
  .action(async () => {
    const { topic } = await inquirer.prompt(questionSearch);
    try {
      const res = await axios.get(`http://catalog:5001/search/${topic}`);
      console.log(' Response Data:', res.data);
    } catch (err) {
      console.error('Error contacting catalog service:', err.message);
    }
  });


program
  .command('info')
  .alias('i')
  .description('Get book info by ID (from Catalog Service)')
  .action(async () => {
    const { bookId } = await inquirer.prompt(questionInfo);
    try {
      const res = await axios.get(`http://catalog:5001/info/${bookId}`);
      console.log(' Response Data:', res.data);
    } catch (err) {
      console.error(' Error contacting catalog service:', err.message);
    }
  });


program
  .command('purchase')
  .alias('p')
  .description('Purchase a book by ID (via Order Service)')
  .action(async () => {
    const { bookId, quantity } = await inquirer.prompt(questionPurchase);
    try {
      const res = await axios.post(`http://order:5002/orders/${bookId}`, { quantity });
      console.log(' Response Data:', res.data);
    } catch (err) {
      console.error(' Error contacting order service:', err.message);
    }
  });

program.parse();
