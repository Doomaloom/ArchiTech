# Describe

POST https://api.ideogram.ai/describe
Content-Type: multipart/form-data

Describe an image.

Supported image formats include JPEG, PNG, and WebP.


Reference: https://developer.ideogram.ai/api-reference/api-reference/describe

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Describe
  version: endpoint_vision.post_describe
paths:
  /describe:
    post:
      operationId: post-describe
      summary: Describe
      description: |
        Describe an image.

        Supported image formats include JPEG, PNG, and WebP.
      tags:
        - - subpackage_vision
      parameters:
        - name: Api-Key
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Description(s) created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DescribeResponse'
        '400':
          description: Invalid input provided.
          content: {}
        '422':
          description: Image failed the safety check.
          content: {}
        '429':
          description: Too many requests.
          content: {}
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                image_file:
                  type: string
                  format: binary
                  description: >-
                    An image binary (max size 10MB); only JPEG, WebP and PNG
                    formats are supported at this time.
                describe_model_version:
                  $ref: '#/components/schemas/DescribeModelVersion'
              required:
                - image_file
components:
  schemas:
    DescribeModelVersion:
      type: string
      enum:
        - value: V_2
        - value: V_3
      default: V_3
    Description:
      type: object
      properties:
        text:
          type: string
          description: The generated description for the provided image.
    DescribeResponse:
      type: object
      properties:
        descriptions:
          type: array
          items:
            $ref: '#/components/schemas/Description'
          description: A collection of descriptions for given content.

```

## SDK Code Examples

```python
import requests

url = "https://api.ideogram.ai/describe"

files = { "image_file": "open('string', 'rb')" }
payload = { "describe_model_version":  }
headers = {"Api-Key": "<apiKey>"}

response = requests.post(url, data=payload, files=files, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.ideogram.ai/describe';
const form = new FormData();
form.append('image_file', 'string');
form.append('describe_model_version', '');

const options = {method: 'POST', headers: {'Api-Key': '<apiKey>'}};

options.body = form;

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.ideogram.ai/describe"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image_file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"describe_model_version\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Api-Key", "<apiKey>")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.ideogram.ai/describe")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Api-Key"] = '<apiKey>'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image_file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"describe_model_version\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.ideogram.ai/describe")
  .header("Api-Key", "<apiKey>")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image_file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"describe_model_version\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.ideogram.ai/describe', [
  'multipart' => [
    [
        'name' => 'image_file',
        'filename' => 'string',
        'contents' => null
    ]
  ]
  'headers' => [
    'Api-Key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.ideogram.ai/describe");
var request = new RestRequest(Method.POST);
request.AddHeader("Api-Key", "<apiKey>");
request.AddParameter("undefined", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"image_file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"describe_model_version\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Api-Key": "<apiKey>"]
let parameters = [
  [
    "name": "image_file",
    "fileName": "string"
  ],
  [
    "name": "describe_model_version",
    "value": 
  ]
]

let boundary = "---011000010111000001101001"

var body = ""
var error: NSError? = nil
for param in parameters {
  let paramName = param["name"]!
  body += "--\(boundary)\r\n"
  body += "Content-Disposition:form-data; name=\"\(paramName)\""
  if let filename = param["fileName"] {
    let contentType = param["content-type"]!
    let fileContent = String(contentsOfFile: filename, encoding: String.Encoding.utf8)
    if (error != nil) {
      print(error as Any)
    }
    body += "; filename=\"\(filename)\"\r\n"
    body += "Content-Type: \(contentType)\r\n\r\n"
    body += fileContent
  } else if let paramValue = param["value"] {
    body += "\r\n\r\n\(paramValue)"
  }
}

let request = NSMutableURLRequest(url: NSURL(string: "https://api.ideogram.ai/describe")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```
