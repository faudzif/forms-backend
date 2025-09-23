const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// .connect("mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/formsDB", {
mongoose
  .connect("mongodb+srv://faudzif:faudzif@cluster0.ntojvsm.mongodb.net/formsDB")
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err));

const i18nStringSchema = new mongoose.Schema(
  {
    en: { type: String, default: "" },
    ar: { type: String, default: "" },
  },
  { _id: false }
);

const validationConfigSchema = new mongoose.Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    required: { type: Boolean, default: false },
    regex: { type: String, default: "" }, // store regex as string
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    label: i18nStringSchema,
    placeholder: i18nStringSchema,
    tooltip: i18nStringSchema,
    validationConfig: validationConfigSchema,
    validationMessage: i18nStringSchema,
  },
  { _id: false }
);

const formSchema = new mongoose.Schema({
  formId: String,
  fields: [fieldSchema],
});

const Form = mongoose.model("Form", formSchema);

const app = express();
const PORT = 3500;

let savedForm = []; // You can replace with DB storage later

app.use(cors());
app.use(express.json());

app.post("/api/form", async (req, res) => {
  console.log("Incoming body:", JSON.stringify(req.body, null, 2));

  if (Array.isArray(req.body)) {
    // Multiple forms
    const forms = await Form.insertMany(req.body);
    console.log("✅ Multiple forms saved:", forms);
    return res
      .status(200)
      .json({ message: "Forms saved successfully!", forms });
  } else {
    // Single form
    const form = new Form(req.body);
    await form.save();
    console.log("✅ Single form saved:", form);
    return res.status(200).json({ message: "Form saved successfully!", form });
  }

  res.status(200).json({ message: "Form saved successfully!" });
});

app.get("/api/form", async (req, res) => {
  res.set("Cache-Control", "no-store");
  // if (!savedForm) {
  //   return res.status(404).json({ message: "No form found" });
  // }
  // res.json(savedForm || []);

  try {
    const forms = await Form.find();
    if (!forms.length) {
      return res.status(404).json({ message: "No forms found" });
    }
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: "Error fetching forms", error: err });
  }


});

// Update specific field by id
app.put("/api/form/:formId/field/:fieldId", (req, res) => {
  const { formId, fieldId } = req.params;
  const updatedField = req.body;

  if (!formId || !fieldId || !updatedField) {
    return res
      .status(400)
      .json({ message: "Form ID, Field ID and updated data are required" });
  }

  // Find the form
  const form = savedForm.find((f) => f.formId === formId);
  if (!form) {
    return res.status(404).json({ message: "Form not found" });
  }

  // Find the field in that form
  const fieldIndex = form.fields.findIndex((f) => f.id === fieldId);
  if (fieldIndex === -1) {
    return res.status(404).json({ message: "Field not found in this form" });
  }

  // Merge old field with new data
  form.fields[fieldIndex] = { ...form.fields[fieldIndex], ...updatedField };

  console.log(`Field ${fieldId} updated in form ${formId}.`);

  res.status(200).json({
    message: `Field ${fieldId} updated successfully!`,
    savedForm,
  });
});

// Delete all the data
app.delete("/api/form/:formId", (req, res) => {
  const { formId } = req.params;

  const index = savedForm.findIndex((f) => f.formId === formId);
  if (index === -1) {
    return res.status(404).json({ message: "Form not found" });
  }

  // Remove form by index
  savedForm.splice(index, 1);

  console.log(`Form with ID ${formId} deleted.`);
  res.status(200).json(savedForm); // send updated list
});

// Delete specific field by id
app.delete("/api/form/:formId/field/:fieldId", (req, res) => {
  const { formId, fieldId } = req.params;

  if (!formId || !fieldId) {
    return res
      .status(400)
      .json({ message: "Form ID and Field ID are required" });
  }

  // Find the form
  const form = savedForm.find((f) => f.formId === formId);
  if (!form) {
    return res.status(404).json({ message: "Form not found" });
  }

  // Remove the field from that form
  const initialLength = form.fields.length;
  form.fields = form.fields.filter((field) => field.id !== fieldId);

  if (form.fields.length === initialLength) {
    return res.status(404).json({ message: "Field not found in this form" });
  }

  console.log(`Field ${fieldId} deleted from form ${formId}.`);
  res.status(200).json({
    message: `Field ${fieldId} deleted successfully from form ${formId}`,
    savedForm,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
