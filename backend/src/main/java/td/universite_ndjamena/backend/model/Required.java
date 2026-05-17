package td.universite_ndjamena.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "required")
public class Required {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lecturer_id", nullable = false, unique = true)
    private Long lecturerId;

    @Column(name = "required_hours", nullable = false)
    private int requiredHours;

    // ── Constructors ──────────────────────────────────────────────────────
    public Required() {}

    public Required(Long lecturerId, int requiredHours) {
        this.lecturerId   = lecturerId;
        this.requiredHours = requiredHours;
    }

    // ── Getters & Setters ─────────────────────────────────────────────────
    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }

    public Long getLecturerId()                { return lecturerId; }
    public void setLecturerId(Long lecturerId) { this.lecturerId = lecturerId; }

    public int getRequiredHours()                    { return requiredHours; }
    public void setRequiredHours(int requiredHours)  { this.requiredHours = requiredHours; }
}