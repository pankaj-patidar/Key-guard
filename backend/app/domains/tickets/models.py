import uuid
import enum
from datetime import datetime
from sqlalchemy import (Column, String, Text, Integer, SmallInteger, Boolean,
                        Date, Float, DateTime, ForeignKey, Enum as SAEnum, UniqueConstraint, Table)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class TicketType(str, enum.Enum):
    EPIC   = "epic"
    SPRINT = "sprint"
    BUG    = "bug"
    TASK   = "task"
    TODO   = "todo"


class TicketStatus(str, enum.Enum):
    BACKLOG            = "backlog"
    TODO               = "todo"
    IN_PROGRESS        = "in_progress"
    IN_REVIEW          = "in_review"
    ON_HOLD            = "on_hold"
    WAITING_FOR_CLIENT = "waiting_for_client"
    DONE               = "done"
    CANCELLED          = "cancelled"


class TicketPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH     = "high"
    MEDIUM   = "medium"
    LOW      = "low"


BOARD_STATUSES = [
    TicketStatus.BACKLOG,
    TicketStatus.TODO,
    TicketStatus.IN_PROGRESS,
    TicketStatus.IN_REVIEW,
    TicketStatus.DONE,
]

PARKING_LOT_STATUSES = [TicketStatus.ON_HOLD, TicketStatus.WAITING_FOR_CLIENT]

ticket_labels_table = Table(
    "ticket_labels", Base.metadata,
    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id",  UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)


class Ticket(Base):
    __tablename__ = "tickets"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number   = Column(Integer, nullable=False)
    project_id      = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title           = Column(String(500), nullable=False)
    type            = Column(SAEnum(TicketType), nullable=False)
    status          = Column(SAEnum(TicketStatus), nullable=False, default=TicketStatus.BACKLOG)
    priority        = Column(SAEnum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM)
    description     = Column(JSONB, nullable=True)
    epic_id         = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    sprint_id       = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    assignee_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    owner_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reporter_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    story_points    = Column(SmallInteger, nullable=True)
    due_date        = Column(Date, nullable=True)
    position        = Column(Float, nullable=False, default=0.0)
    is_archived     = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project         = relationship("Project")
    assignee        = relationship("User", foreign_keys=[assignee_id])
    owner           = relationship("User", foreign_keys=[owner_id])
    reporter        = relationship("User", foreign_keys=[reporter_id])
    epic            = relationship("Ticket", foreign_keys=[epic_id], remote_side="Ticket.id",
                                   primaryjoin="Ticket.epic_id == Ticket.id")
    sprint_ticket   = relationship("Ticket", foreign_keys=[sprint_id], remote_side="Ticket.id",
                                   primaryjoin="Ticket.sprint_id == Ticket.id")
    sprint_detail   = relationship("SprintDetail", back_populates="ticket",
                                   cascade="all, delete-orphan", uselist=False)
    labels          = relationship("Label", secondary=ticket_labels_table, back_populates="tickets")
    watchers        = relationship("TicketWatcher", back_populates="ticket", cascade="all, delete-orphan")


class SprintDetail(Base):
    __tablename__ = "sprint_details"

    ticket_id  = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    start_date = Column(Date, nullable=True)
    end_date   = Column(Date, nullable=True)
    goal       = Column(Text, nullable=True)
    is_active  = Column(Boolean, default=False, nullable=False)

    ticket = relationship("Ticket", back_populates="sprint_detail")


class Label(Base):
    __tablename__ = "labels"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(50), nullable=False)
    color      = Column(String(7), default="#6366f1")

    tickets = relationship("Ticket", secondary=ticket_labels_table, back_populates="labels")


class ProjectTicketCounter(Base):
    __tablename__ = "project_ticket_counter"

    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    last_number = Column(Integer, default=0, nullable=False)


class TicketWatcher(Base):
    __tablename__ = "ticket_watchers"
    __table_args__ = (UniqueConstraint("ticket_id", "user_id", name="uq_ticket_watcher"),)

    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    user_id   = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    ticket = relationship("Ticket", back_populates="watchers")
    user   = relationship("User")
