(function () {
  "use strict";

  const script = document.currentScript;
  const widgetId = script && script.dataset.widgetId;

  if (!widgetId) {
    console.error("FlyRank: missing data-widget-id.");
    return;
  }

  const apiBase = new URL(script.src).origin;
  const container = document.createElement("div");
  container.className = "flyrank-widget";
  container.setAttribute("data-flyrank-widget", widgetId);
  script.insertAdjacentElement("afterend", container);

  const style = document.createElement("style");
  style.textContent = `
    .flyrank-widget {
      max-width: 420px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 12px;
      font: 15px/1.5 system-ui, sans-serif;
      color: #222;
      background: #fff;
    }
    .flyrank-widget * { box-sizing: border-box; }
    .flyrank-widget h3 { margin: 0 0 8px; font-size: 21px; }
    .flyrank-widget p { margin: 0 0 16px; color: #555; }
    .flyrank-widget label { display: block; margin: 12px 0 5px; }
    .flyrank-widget input,
    .flyrank-widget textarea {
      display: block;
      width: 100%;
      padding: 10px;
      border: 1px solid #bbb;
      border-radius: 6px;
      font: inherit;
    }
    .flyrank-widget button {
      margin-top: 16px;
      padding: 10px 16px;
      border: 0;
      border-radius: 6px;
      background: #2457d6;
      color: white;
      font: inherit;
      cursor: pointer;
    }
    .flyrank-widget button:disabled { opacity: .6; cursor: wait; }
    .flyrank-widget [role="status"] { margin-top: 12px; }
  `;
  document.head.appendChild(style);

  function showMessage(message, isError) {
    let status = container.querySelector("[role='status']");

    if (!status) {
      status = document.createElement("div");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      container.appendChild(status);
    }

    status.textContent = message;
    status.style.color = isError ? "#b42318" : "#176b37";
  }

  function createField(field) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    const inputType = ["text", "email", "tel", "number"].includes(field.type)
      ? field.type
      : "text";

    const input = field.type === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");

    label.textContent = field.label || field.name;
    label.htmlFor = "flyrank-" + widgetId + "-" + field.name;
    input.id = label.htmlFor;
    input.name = field.name;
    input.required = field.required === true;
    input.maxLength = 1000;

    if (input.tagName === "INPUT") {
      input.type = inputType;
    }

    wrapper.append(label, input);
    return wrapper;
  }

  async function initialize() {
    try {
      const response = await fetch(
        apiBase + "/api/public/widgets/" +
        encodeURIComponent(widgetId) + "/config"
      );

      if (!response.ok) {
        throw new Error("Could not load widget configuration.");
      }

      const result = await response.json();
      const widget = result.widget;

      container.replaceChildren();

      const heading = document.createElement("h3");
      heading.textContent = widget.title;
      container.appendChild(heading);

      if (widget.description) {
        const description = document.createElement("p");
        description.textContent = widget.description;
        container.appendChild(description);
      }

      const form = document.createElement("form");

      // Honeypot: hide from people, but leave it in the form for bots.
      const honeypot = document.createElement("input");
      honeypot.type = "text";
      honeypot.name = "website_url";
      honeypot.tabIndex = -1;
      honeypot.autocomplete = "off";
      honeypot.setAttribute("aria-hidden", "true");
      honeypot.style.cssText =
        "position:absolute;left:-10000px;width:1px;height:1px;";
      form.appendChild(honeypot);

      const fields = Array.isArray(widget.fields) ? widget.fields : [];

      for (const field of fields) {
        if (
          !field ||
          typeof field.name !== "string" ||
          !/^[a-zA-Z0-9_-]{1,100}$/.test(field.name)
        ) {
          continue;
        }

        form.appendChild(createField(field));
      }

      const button = document.createElement("button");
      button.type = "submit";
      button.textContent = widget.button_text || "Submit";
      form.appendChild(button);

      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        button.disabled = true;

        const data = {};

        for (const field of fields) {
          if (
            field &&
            typeof field.name === "string" &&
            /^[a-zA-Z0-9_-]{1,100}$/.test(field.name)
          ) {
            const input = form.elements.namedItem(field.name);

            if (input && typeof input.value === "string") {
              data[field.name] = input.value;
            }
          }
        }

        try {
          const submitResponse = await fetch(
            apiBase + "/api/public/widgets/" +
            encodeURIComponent(widgetId) + "/submissions",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data,
                website_url: honeypot.value
              })
            }
          );

          const payload = await submitResponse.json().catch(() => ({}));

          if (!submitResponse.ok) {
            throw new Error(
              payload.error || "Submission failed. Please try again."
            );
          }

          form.reset();
          showMessage("Thank you! Your response has been received.", false);
        } catch (error) {
          showMessage(error.message || "Could not submit the form.", true);
        } finally {
          button.disabled = false;
        }
      });

      container.appendChild(form);
    } catch (error) {
      container.replaceChildren();
      showMessage(error.message || "Could not load widget.", true);
    }
  }

  initialize();
})();
