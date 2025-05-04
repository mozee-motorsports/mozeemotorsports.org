use std::io;

use pulldown_cmark::{Options, Parser};
use toml::{Table, Value};

#[derive(Default, ramhorns::Content)]
pub struct Entry {
    pub title: String,
    pub content: String,
    pub refnum: Option<String>,
    pub author: Option<String>,
    pub slug: Option<String>,
}

impl Entry {
    pub fn from_str(content: &str) -> io::Result<Entry> {
        let mut entry = Entry::default();

        let (frontmatter_content, body_content) = if content.starts_with("---\n") {
            let mut parts = content.splitn(3, "---\n");
            parts.next(); 
            match (parts.next(), parts.next()) {
                (Some(frontmatter), Some(body)) => (Some(frontmatter), body),
                _ => (None, content),
            }
        } else {
            (None, content)
        };

        if let Some(frontmatter) = frontmatter_content {
            match frontmatter.parse::<Table>() {
                Ok(table) => {

                    if let Some(Value::String(title)) = table.get("title") {
                        entry.title = title.to_string();
                    }

                    if let Some(Value::String(author)) = table.get("author") {
                        entry.author = Some(author.to_string());
                    }

                    if let Some(Value::String(slug)) = table.get("slug") {
                        entry.slug = Some(slug.to_string());
                    }

                    if let Some(Value::Integer(refnum)) = table.get("refnum") {
                        entry.refnum = Some(format!("{:04}", refnum));
                    }

                }
                Err(e) => {
                    eprintln!("Failed to parse frontmatter: {}", e);
                }
            };
        }

        let options = Options::ENABLE_MATH
            | Options::ENABLE_FOOTNOTES
            | Options::ENABLE_YAML_STYLE_METADATA_BLOCKS
            | Options::ENABLE_SUPERSCRIPT
            | Options::ENABLE_SUBSCRIPT
            | Options::ENABLE_STRIKETHROUGH
            | Options::ENABLE_SMART_PUNCTUATION;

        let parser = Parser::new_ext(body_content, options);
        let mut html_content = String::new();
        pulldown_cmark::html::push_html(&mut html_content, parser);
        entry.content = html_content;
        return Ok(entry);
    }
}

