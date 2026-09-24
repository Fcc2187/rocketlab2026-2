from collections import OrderedDict
from time import monotonic

from pydantic import BaseModel

from app.core.config import get_settings


class MovieCache:
    """Cache local e limitado das respostas públicas de filmes."""

    def __init__(self) -> None:
        self.entries: OrderedDict[tuple, tuple[float, BaseModel]] = OrderedDict()
        self.generation = 0

    def get(self, key: tuple) -> BaseModel | None:
        if get_settings().cache_ttl_seconds == 0:
            return None
        entry = self.entries.get(key)
        if entry is None:
            return None
        if entry[0] <= monotonic():
            del self.entries[key]
            return None
        self.entries.move_to_end(key)
        return entry[1].model_copy(deep=True)

    def put_if_current(self, key: tuple, value: BaseModel, generation: int) -> None:
        ttl = get_settings().cache_ttl_seconds
        if ttl == 0 or generation != self.generation:
            return
        self.entries[key] = (monotonic() + ttl, value.model_copy(deep=True))
        self.entries.move_to_end(key)
        if len(self.entries) > 256:
            self.entries.popitem(last=False)

    def invalidate(self) -> None:
        self.generation += 1
        self.entries.clear()


movie_cache = MovieCache()
