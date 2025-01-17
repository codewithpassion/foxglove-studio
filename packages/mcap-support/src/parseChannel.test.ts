// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import fs from "fs";
import { FileDescriptorSet, IFileDescriptorSet } from "protobufjs/ext/descriptor";

import { parseChannel } from "./parseChannel";

describe("parseChannel", () => {
  it("works with json/jsonschema", () => {
    const channel = parseChannel({
      messageEncoding: "json",
      schema: {
        name: "X",
        encoding: "jsonschema",
        data: new TextEncoder().encode(
          JSON.stringify({ type: "object", properties: { value: { type: "string" } } }),
        ),
      },
    });
    expect(channel.fullSchemaName).toEqual("X");
    expect(channel.deserializer(new TextEncoder().encode(JSON.stringify({ value: "hi" })))).toEqual(
      { value: "hi" },
    );
  });

  it("works with flatbuffer", () => {
    const reflectionSchema = fs.readFileSync(`${__dirname}/fixtures/reflection.bfbs`);
    const channel = parseChannel({
      messageEncoding: "flatbuffer",
      schema: { name: "reflection.Schema", encoding: "flatbuffer", data: reflectionSchema },
    });
    expect(channel.fullSchemaName).toEqual("reflection.Schema");
    const deserialized = channel.deserializer(reflectionSchema) as {
      objects: Record<string, unknown>[];
    };
    expect(deserialized.objects.length).toEqual(10);
    expect(deserialized.objects[0]!.name).toEqual("reflection.Enum");
  });

  it("works with protobuf", () => {
    const fds = FileDescriptorSet.encode(FileDescriptorSet.root.toDescriptor("proto3")).finish();
    const channel = parseChannel({
      messageEncoding: "protobuf",
      schema: { name: "google.protobuf.FileDescriptorSet", encoding: "protobuf", data: fds },
    });
    expect(channel.fullSchemaName).toEqual("google.protobuf.FileDescriptorSet");
    const deserialized = channel.deserializer(fds) as IFileDescriptorSet;
    expect(deserialized.file[0]!.name).toEqual("google_protobuf.proto");
  });

  it("works with ros1", () => {
    const channel = parseChannel({
      messageEncoding: "ros1",
      schema: {
        name: "foo_msgs/Bar",
        encoding: "ros1msg",
        data: new TextEncoder().encode("string data"),
      },
    });
    expect(channel.fullSchemaName).toEqual("foo_msgs/Bar");

    const obj = channel.deserializer(new Uint8Array([4, 0, 0, 0, 65, 66, 67, 68]));
    expect(obj).toEqual({ data: "ABCD" });
  });

  it("works with ros2", () => {
    const channel = parseChannel({
      messageEncoding: "cdr",
      schema: {
        name: "foo_msgs/Bar",
        encoding: "ros2msg",
        data: new TextEncoder().encode("string data"),
      },
    });
    expect(channel.fullSchemaName).toEqual("foo_msgs/Bar");

    const obj = channel.deserializer(new Uint8Array([0, 1, 0, 0, 5, 0, 0, 0, 65, 66, 67, 68, 0]));
    expect(obj).toEqual({ data: "ABCD" });
  });
});
