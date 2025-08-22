const pool = require('../config/db');
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT category_id AS categoryId, category_name AS categoryName, description
         FROM categories
        WHERE user_id = ?
        ORDER BY category_name ASC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({ message: 'categoryName is required' });
    }

    const userId = req.user.userId;

    const [result] = await pool.query(
      `INSERT INTO categories (category_name, description, user_id) VALUES (?, ?, ?)`,
      [categoryName.trim(), description || null, userId]
    );

    res.status(201).json({ categoryId: result.insertId });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Failed to create category' });
  }
};


// UPDATE
exports.updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { categoryName, description } = req.body;
    if (!id) return res.status(400).json({ message: 'Invalid id' });

   const [result] = await pool.query(
  `UPDATE categories 
      SET category_name = ?, description = ? 
    WHERE category_id = ? AND user_id = ?`,
  [categoryName || null, description || null, id, req.user.userId]
);


    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// DELETE
exports.deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const [result] = await pool.query(
  `DELETE FROM categories WHERE category_id = ? AND user_id = ?`,
  [id, req.user.userId]
);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};