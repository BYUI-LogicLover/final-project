export const sampleBooks = [
  {
    id: 1,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    rating: 4.2,
    pages: 180,
    published: "1925",
    genre: "Classic Fiction",
    isbn: "978-0743273565",
    description: "The story of the mysteriously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan, set against the backdrop of 1920s Jazz Age Long Island."
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    rating: 4.5,
    pages: 281,
    published: "1960",
    genre: "Classic Fiction",
    isbn: "978-0061120084",
    description: "A gripping, heart-wrenching tale of racial injustice and childhood innocence in the Deep South during the 1930s."
  },
  {
    id: 3,
    title: "1984",
    author: "George Orwell",
    rating: 4.3,
    pages: 328,
    published: "1949",
    genre: "Dystopian Fiction",
    isbn: "978-0451524935",
    description: "A dystopian social science fiction novel and cautionary tale about the dangers of totalitarianism."
  },
  {
    id: 4,
    title: "Pride and Prejudice",
    author: "Jane Austen",
    rating: 4.4,
    pages: 432,
    published: "1813",
    genre: "Romance",
    isbn: "978-0141439518",
    description: "A romantic novel following the emotional development of Elizabeth Bennet as she deals with issues of manners, morality, and marriage."
  },
  {
    id: 5,
    title: "The Catcher in the Rye",
    author: "J.D. Salinger",
    rating: 3.8,
    pages: 234,
    published: "1951",
    genre: "Literary Fiction",
    isbn: "978-0316769488",
    description: "The story of teenage angst and alienation as experienced by Holden Caulfield in New York City."
  },
  {
    id: 6,
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    rating: 4.6,
    pages: 310,
    published: "1937",
    genre: "Fantasy",
    isbn: "978-0547928227",
    description: "A fantasy novel about the adventures of hobbit Bilbo Baggins, who embarks on an unexpected journey."
  },
  {
    id: 7,
    title: "Brave New World",
    author: "Aldous Huxley",
    rating: 4.0,
    pages: 288,
    published: "1932",
    genre: "Dystopian Fiction",
    isbn: "978-0060850524",
    description: "A dystopian novel set in a futuristic World State of genetically modified citizens."
  },
  {
    id: 8,
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    rating: 4.7,
    pages: 1178,
    published: "1954",
    genre: "Fantasy",
    isbn: "978-0618640157",
    description: "An epic high-fantasy novel following the hobbit Frodo Baggins and the Fellowship on their quest to destroy the One Ring."
  },
  {
    id: 9,
    title: "Jane Eyre",
    author: "Charlotte Brontë",
    rating: 4.1,
    pages: 500,
    published: "1847",
    genre: "Gothic Romance",
    isbn: "978-0141441146",
    description: "A novel following the experiences of its eponymous heroine, including her growth to adulthood and her love for Mr. Rochester."
  },
  {
    id: 10,
    title: "Wuthering Heights",
    author: "Emily Brontë",
    rating: 3.9,
    pages: 416,
    published: "1847",
    genre: "Gothic Fiction",
    isbn: "978-0141439556",
    description: "A wild, passionate story of the intense and almost demonic love between Catherine Earnshaw and Heathcliff."
  },
  {
    id: 11,
    title: "Dune",
    author: "Frank Herbert",
    rating: 4.5,
    pages: 688,
    published: "1965",
    genre: "Science Fiction",
    isbn: "978-0441172719",
    description: "A science fiction masterpiece set on the desert planet Arrakis, home to the most valuable substance in the universe."
  },
  {
    id: 12,
    title: "The Alchemist",
    author: "Paulo Coelho",
    rating: 4.2,
    pages: 208,
    published: "1988",
    genre: "Fiction",
    isbn: "978-0062315007",
    description: "A magical story of Santiago, an Andalusian shepherd boy who dreams of traveling the world in search of treasure."
  }
];

export const readingLists = {
  reading: [
    { ...sampleBooks[0], progress: 65 },
    { ...sampleBooks[5], progress: 30 },
  ],
  toRead: [
    sampleBooks[2],
    sampleBooks[6],
    sampleBooks[10],
  ],
  completed: [
    { ...sampleBooks[1], completedDate: '2024-01-15' },
    { ...sampleBooks[3], completedDate: '2024-01-02' },
    { ...sampleBooks[7], completedDate: '2023-12-20' },
    { ...sampleBooks[11], completedDate: '2023-12-10' },
  ]
};

export const userStats = {
  booksRead: 24,
  pagesRead: 8432,
  avgRating: 4.2,
  readingStreak: 12,
  monthlyData: [3, 5, 2, 4, 6, 3, 4, 5, 2, 4, 3, 5],
  genreDistribution: {
    'Fiction': 35,
    'Fantasy': 25,
    'Science Fiction': 20,
    'Non-Fiction': 20
  },
  favoriteAuthors: [
    { name: 'J.R.R. Tolkien', books: 5, avgRating: 4.6 },
    { name: 'George Orwell', books: 3, avgRating: 4.3 },
    { name: 'Jane Austen', books: 3, avgRating: 4.4 },
    { name: 'Frank Herbert', books: 2, avgRating: 4.5 },
    { name: 'Paulo Coelho', books: 2, avgRating: 4.0 }
  ]
};
