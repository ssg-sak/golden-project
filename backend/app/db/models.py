# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Hospital(Base):
    """기존 호환성 유지를 위한 Hospital 테이블"""
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

class AdminDong(Base):
    __tablename__ = "admin_dong"

    admin_dong_code = Column(String, primary_key=True, index=True)
    sido_code = Column(String, nullable=True)
    sigungu_code = Column(String, nullable=True)
    sido_name = Column(String, nullable=False)
    sigungu_name = Column(String, nullable=True)
    admin_dong_name = Column(String, nullable=False, index=True)
    full_address = Column(String, nullable=True)
    center_latitude = Column(Float, nullable=True)
    center_longitude = Column(Float, nullable=True)
    geometry = Column(String, nullable=True)  # WKT나 GeoJSON String
    is_active = Column(Boolean, default=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())

class MedicalFacility(Base):
    __tablename__ = "medical_facility"

    facility_id = Column(String, primary_key=True, index=True)
    facility_name = Column(String, nullable=False, index=True)
    official_type_code = Column(String, nullable=True)
    official_type_name = Column(String, nullable=True)
    dashboard_category = Column(String, nullable=True) # large, secondary, moonlightPediatric 등
    address = Column(String, nullable=True)
    sido_name = Column(String, nullable=True)
    sigungu_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    emergency_phone = Column(String, nullable=True)
    is_moonlight = Column(Boolean, default=False)
    is_pediatric_center = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())

class PopulationSnapshot(Base):
    __tablename__ = "population_snapshot"

    base_month = Column(String, primary_key=True) # "2026.06"
    admin_dong_code = Column(String, primary_key=True)
    admin_dong_name = Column(String, nullable=False)
    total_population = Column(Integer, default=0)
    male_population = Column(Integer, default=0)
    female_population = Column(Integer, default=0)
    household_count = Column(Integer, default=0)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())

class DataSourceStatus(Base):
    __tablename__ = "data_source_status"

    source_name = Column(String, primary_key=True)
    source_version = Column(String, nullable=True)
    data_hash = Column(String, nullable=True)
    record_count = Column(Integer, default=0)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    last_updated_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=True) # updated, unchanged, failed, running
    error_message = Column(String, nullable=True)

class DashboardSnapshot(Base):
    __tablename__ = "dashboard_snapshot"

    snapshot_id = Column(Integer, primary_key=True, autoincrement=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    admin_dong_count = Column(Integer, default=0)
    emergency_total = Column(Integer, default=0)
    large_emergency_count = Column(Integer, default=0)
    secondary_emergency_count = Column(Integer, default=0)
    moonlight_pediatric_count = Column(Integer, default=0)
    high_risk_admin_dong_count = Column(Integer, default=0)
    risk_threshold = Column(Float, default=0.0)
    population_base_month = Column(String, nullable=True)
    source_versions = Column(String, nullable=True) # JSON String
    analysis_version = Column(String, nullable=True)


class JobLock(Base):
    __tablename__ = "job_lock"

    lock_name = Column(String, primary_key=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String, nullable=True)

