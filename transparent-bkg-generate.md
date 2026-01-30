# Generate with Ideogram 3.0 (Transparent Background)

POST https://api.ideogram.ai/v1/ideogram-v3/generate-transparent
Content-Type: multipart/form-data

Generates images with transparent background synchronously based on a given prompt and optional parameters using
the Ideogram 3.0 model. Images will be generated using maximum supported resolution at the specified aspect ratio
to allow best results with upscaler. The selected resolution is written to the response, not the upscaled final
resolution.

Images links are available for a limited period of time; if you would like to keep the image, you must download it.


Reference: https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Generate with Ideogram 3.0 (Transparent Background)
  version: endpoint_generate.post_generate_image_v3_transparent
paths:
  /v1/ideogram-v3/generate-transparent:
    post:
      operationId: post-generate-image-v-3-transparent
      summary: Generate with Ideogram 3.0 (Transparent Background)
      description: >
        Generates images with transparent background synchronously based on a
        given prompt and optional parameters using

        the Ideogram 3.0 model. Images will be generated using maximum supported
        resolution at the specified aspect ratio

        to allow best results with upscaler. The selected resolution is written
        to the response, not the upscaled final

        resolution.


        Images links are available for a limited period of time; if you would
        like to keep the image, you must download it.
      tags:
        - - subpackage_generate
      parameters:
        - name: Api-Key
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Image(s) generated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ImageGenerationResponseV3'
        '400':
          description: Invalid input provided.
          content: {}
        '401':
          description: Not authorized to generate an image.
          content: {}
        '422':
          description: Prompt failed the safety check.
          content: {}
        '429':
          description: Too many requests.
          content: {}
      requestBody:
        description: >-
          A request to generate an image with transparent background using
          Ideogram 3.0, with optional upscaling.
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                prompt:
                  type: string
                  description: The prompt to use to generate the image.
                seed:
                  type: integer
                  description: Random seed. Set for reproducible generation.
                upscale_factor:
                  $ref: '#/components/schemas/UpscaleFactor'
                aspect_ratio:
                  $ref: '#/components/schemas/AspectRatioV3'
                rendering_speed:
                  $ref: '#/components/schemas/RenderingSpeed'
                magic_prompt:
                  $ref: '#/components/schemas/MagicPromptOption'
                negative_prompt:
                  type: string
                  description: >
                    Description of what to exclude from an image. Descriptions
                    in the prompt take precedence

                    to descriptions in the negative prompt.
                num_images:
                  type: integer
                  default: 1
                  description: Number of images to generate.
              required:
                - prompt
components:
  schemas:
    UpscaleFactor:
      type: string
      enum:
        - value: X1
        - value: X2
        - value: X4
      default: X1
    AspectRatioV3:
      type: string
      enum:
        - value: 1x3
        - value: 3x1
        - value: 1x2
        - value: 2x1
        - value: 9x16
        - value: 16x9
        - value: 10x16
        - value: 16x10
        - value: 2x3
        - value: 3x2
        - value: 3x4
        - value: 4x3
        - value: 4x5
        - value: 5x4
        - value: 1x1
    RenderingSpeed:
      type: string
      enum:
        - value: FLASH
        - value: TURBO
        - value: DEFAULT
        - value: QUALITY
      default: DEFAULT
    MagicPromptOption:
      type: string
      enum:
        - value: AUTO
        - value: 'ON'
        - value: 'OFF'
    ResolutionV3:
      type: string
      enum:
        - value: 512x1536
        - value: 576x1408
        - value: 576x1472
        - value: 576x1536
        - value: 640x1344
        - value: 640x1408
        - value: 640x1472
        - value: 640x1536
        - value: 704x1152
        - value: 704x1216
        - value: 704x1280
        - value: 704x1344
        - value: 704x1408
        - value: 704x1472
        - value: 736x1312
        - value: 768x1088
        - value: 768x1216
        - value: 768x1280
        - value: 768x1344
        - value: 800x1280
        - value: 832x960
        - value: 832x1024
        - value: 832x1088
        - value: 832x1152
        - value: 832x1216
        - value: 832x1248
        - value: 864x1152
        - value: 896x960
        - value: 896x1024
        - value: 896x1088
        - value: 896x1120
        - value: 896x1152
        - value: 960x832
        - value: 960x896
        - value: 960x1024
        - value: 960x1088
        - value: 1024x832
        - value: 1024x896
        - value: 1024x960
        - value: 1024x1024
        - value: 1088x768
        - value: 1088x832
        - value: 1088x896
        - value: 1088x960
        - value: 1120x896
        - value: 1152x704
        - value: 1152x832
        - value: 1152x864
        - value: 1152x896
        - value: 1216x704
        - value: 1216x768
        - value: 1216x832
        - value: 1248x832
        - value: 1280x704
        - value: 1280x768
        - value: 1280x800
        - value: 1312x736
        - value: 1344x640
        - value: 1344x704
        - value: 1344x768
        - value: 1408x576
        - value: 1408x640
        - value: 1408x704
        - value: 1472x576
        - value: 1472x640
        - value: 1472x704
        - value: 1536x512
        - value: 1536x576
        - value: 1536x640
    StyleTypeV3:
      type: string
      enum:
        - value: AUTO
        - value: GENERAL
        - value: REALISTIC
        - value: DESIGN
        - value: FICTION
      default: GENERAL
    ImageGenerationObjectV3:
      type: object
      properties:
        url:
          type:
            - string
            - 'null'
          format: uri
          description: The direct link to the image generated.
        prompt:
          type: string
          description: >-
            The prompt used for the generation. This may be different from the
            original prompt.
        resolution:
          $ref: '#/components/schemas/ResolutionV3'
        upscaled_resolution:
          type: string
          description: >-
            Output resolution, only used if operations alters image dimensions,
            such as upscale, crop etc.
        is_image_safe:
          type: boolean
          description: >-
            Whether this request passes safety checks. If false, the url field
            will be empty.
        seed:
          type: integer
          description: Random seed. Set for reproducible generation.
        style_type:
          $ref: '#/components/schemas/StyleTypeV3'
      required:
        - prompt
        - resolution
        - is_image_safe
        - seed
    ImageGenerationResponseV3:
      type: object
      properties:
        created:
          type: string
          format: date-time
          description: The time the request was created.
        data:
          type: array
          items:
            $ref: '#/components/schemas/ImageGenerationObjectV3'
          description: A list of ImageObjects that contain the generated image(s).
      required:
        - created
        - data

```

## SDK Code Examples

```python
import requests

# Generate with Ideogram 3.0 (POST /v1/ideogram-v3/generate-transparent)
response = requests.post(
  "https://api.ideogram.ai/v1/ideogram-v3/generate-transparent",
  headers={
    "Api-Key": "<apiKey>"
  },
  json={
    "prompt": "A logo for Ideogram Coffee.",
    "rendering_speed": "TURBO"
  }
)
print(response.json())
with open('output.png', 'wb') as f:
  f.write(requests.get(response.json()['data'][0]['url']).content)

```

```typescript
const formData = new FormData();
formData.append('prompt', 'A logo for Ideogram Coffee.');
formData.append('rendering_speed', 'TURBO');
const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate-transparent', {
  method: 'POST',
  headers: { 'Api-Key': '<apiKey>' },
  body: formData
});
const data = await response.json();
console.log(data);

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

	url := "https://api.ideogram.ai/v1/ideogram-v3/generate-transparent"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA logo for Ideogram Coffee.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"upscale_factor\"\r\n\r\nX2\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"aspect_ratio\"\r\n\r\n1x1\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\nTURBO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"negative_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Api-Key", "<apiKey>")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

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

url = URI("https://api.ideogram.ai/v1/ideogram-v3/generate-transparent")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Api-Key"] = '<apiKey>'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA logo for Ideogram Coffee.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"upscale_factor\"\r\n\r\nX2\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"aspect_ratio\"\r\n\r\n1x1\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\nTURBO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"negative_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.ideogram.ai/v1/ideogram-v3/generate-transparent")
  .header("Api-Key", "<apiKey>")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA logo for Ideogram Coffee.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"upscale_factor\"\r\n\r\nX2\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"aspect_ratio\"\r\n\r\n1x1\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\nTURBO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"negative_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.ideogram.ai/v1/ideogram-v3/generate-transparent', [
  'multipart' => [
    [
        'name' => 'prompt',
        'contents' => 'A logo for Ideogram Coffee.'
    ],
    [
        'name' => 'upscale_factor',
        'contents' => 'X2'
    ],
    [
        'name' => 'aspect_ratio',
        'contents' => '1x1'
    ],
    [
        'name' => 'rendering_speed',
        'contents' => 'TURBO'
    ]
  ]
  'headers' => [
    'Api-Key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.ideogram.ai/v1/ideogram-v3/generate-transparent");
var request = new RestRequest(Method.POST);
request.AddHeader("Api-Key", "<apiKey>");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"prompt\"\r\n\r\nA logo for Ideogram Coffee.\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"upscale_factor\"\r\n\r\nX2\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"aspect_ratio\"\r\n\r\n1x1\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"rendering_speed\"\r\n\r\nTURBO\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"magic_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"negative_prompt\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_images\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "Api-Key": "<apiKey>",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "prompt",
    "value": "A logo for Ideogram Coffee."
  ],
  [
    "name": "seed",
    "value": 
  ],
  [
    "name": "upscale_factor",
    "value": "X2"
  ],
  [
    "name": "aspect_ratio",
    "value": "1x1"
  ],
  [
    "name": "rendering_speed",
    "value": "TURBO"
  ],
  [
    "name": "magic_prompt",
    "value": 
  ],
  [
    "name": "negative_prompt",
    "value": 
  ],
  [
    "name": "num_images",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.ideogram.ai/v1/ideogram-v3/generate-transparent")! as URL,
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
