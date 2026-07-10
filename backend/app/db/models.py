# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, String, Float
from app.db.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, index=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    tier = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    tel = Column(String, nullable=True)
    
    def to_dict(self):
        return {
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
            "tier": self.tier,
            "address": self.address,
            "tel": self.tel
        }
