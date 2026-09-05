import unittest
from unittest.mock import patch

from app import database


class DatabaseInitTests(unittest.TestCase):
    @patch("app.database.SQLModel.metadata.create_all", side_effect=RuntimeError("db unavailable"))
    def test_init_db_does_not_raise_when_database_initialization_fails(self, mock_create_all):
        database.init_db()

        mock_create_all.assert_called_once_with(database.engine)


if __name__ == "__main__":
    unittest.main()
