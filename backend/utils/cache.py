# backend/utils/cache.py
from typing import Optional, Dict, List

class QuestionnaireCache:
    
    _instance = None
    _data: Optional[Dict] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._data = None
        return cls._instance
    
    def set_data(self, questions: List[Dict], sector: str) -> None:
        """Store uploaded questionnaire data"""
        self._data = {
            "success": True,
            "questions": questions,
            "sector": sector,
            "total_questions": len(questions)
        }
        print(f"✅ Cached {len(questions)} questions from sector: {sector}")
    
    def get_data(self) -> Optional[Dict]:
        """Retrieve cached questionnaire data"""
        return self._data
    
    def has_data(self) -> bool:
        """Check if cache has data"""
        return self._data is not None
    
    def clear(self) -> None:
        """Clear cached data"""
        self._data = None
        print("🗑️  Cache cleared")

# Global cache instance
questionnaire_cache = QuestionnaireCache()