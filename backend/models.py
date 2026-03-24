from datetime import datetime
from sqlalchemy import Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Report(Base):
    """Stores each uploaded NDJSON privacy report file."""

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_content: Mapped[str] = mapped_column(Text, nullable=False)  # raw NDJSON text
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    app_accesses: Mapped[list["AppAccess"]] = relationship(
        "AppAccess", back_populates="report", cascade="all, delete-orphan"
    )


class AppAccess(Base):
    """Stores parsed analysis results per app for a given report."""

    __tablename__ = "app_accesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id"), nullable=False)

    bundle_id: Mapped[str] = mapped_column(String, nullable=False)
    app_name: Mapped[str] = mapped_column(String, nullable=False)

    # e.g. {"location": 5, "contacts": 2}
    categories: Mapped[dict] = mapped_column(JSON, nullable=False)

    access_count: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)  # normal | warning | suspicious
    analysis: Mapped[str] = mapped_column(Text, nullable=False)

    # First raw NDJSON entry for this app — used as sample data in the UI
    sample_entry: Mapped[str] = mapped_column(Text, nullable=True)

    report: Mapped["Report"] = relationship("Report", back_populates="app_accesses")
